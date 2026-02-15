#!/usr/bin/env python3
"""
Recommendation 2: Contract-First API Validation
Auto-generates TypeScript interfaces from FastAPI OpenAPI schema.

Usage:
    python .agent/scripts/validate_api_contract.py --backend-url=http://localhost:8000
    python .agent/scripts/validate_api_contract.py --module=inventory
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any
import urllib.request
import urllib.error


def fetch_openapi_schema(backend_url: str) -> dict:
    """Fetch OpenAPI schema from FastAPI backend"""
    openapi_url = f"{backend_url}/openapi.json"
    try:
        with urllib.request.urlopen(openapi_url, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print(f"❌ Failed to fetch OpenAPI schema from {openapi_url}")
        print(f"   Error: {e}")
        print(f"   Make sure backend is running at {backend_url}")
        sys.exit(1)


def extract_module_schemas(openapi: dict, module_name: str = None) -> dict:
    """Extract schemas related to a specific module"""
    all_schemas = openapi.get("components", {}).get("schemas", {})
    
    if module_name:
        # Filter schemas by module name
        filtered = {
            name: schema for name, schema in all_schemas.items()
            if module_name.lower() in name.lower()
        }
        return filtered
    return all_schemas


def python_type_to_typescript(python_type: str, format_hint: str = None) -> str:
    """Convert Python/JSON Schema types to TypeScript types"""
    type_map = {
        "string": "string",
        "integer": "number",
        "number": "number",
        "boolean": "boolean",
        "array": "any[]",
        "object": "Record<string, any>",
        "null": "null",
    }
    
    # Handle format hints
    if format_hint == "uuid":
        return "string"  # UUID as string in TypeScript
    if format_hint == "date-time":
        return "Date"
    if format_hint == "date":
        return "string"  # ISO date string
    if format_hint == "decimal":
        return "number"
    
    return type_map.get(python_type, "any")


def schema_to_typescript_interface(name: str, schema: dict, all_schemas: dict) -> str:
    """Convert a single JSON schema to TypeScript interface"""
    lines = [f"export interface {name} {{"]
    
    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    
    for prop_name, prop_schema in properties.items():
        # Determine if optional
        optional = "" if prop_name in required else "?"
        
        # Get type
        if "$ref" in prop_schema:
            # Reference to another schema
            ref_name = prop_schema["$ref"].split("/")[-1]
            ts_type = ref_name
        elif "allOf" in prop_schema:
            # allOf usually means extension
            refs = [item.get("$ref", "").split("/")[-1] for item in prop_schema["allOf"] if "$ref" in item]
            ts_type = refs[0] if refs else "any"
        elif prop_schema.get("type") == "array":
            items = prop_schema.get("items", {})
            if "$ref" in items:
                item_type = items["$ref"].split("/")[-1]
            else:
                item_type = python_type_to_typescript(items.get("type", "any"))
            ts_type = f"{item_type}[]"
        else:
            ts_type = python_type_to_typescript(
                prop_schema.get("type", "any"),
                prop_schema.get("format")
            )
        
        # Handle enums
        if "enum" in prop_schema:
            enum_values = prop_schema["enum"]
            ts_type = " | ".join([f"'{v}'" for v in enum_values])
        
        lines.append(f"  {prop_name}{optional}: {ts_type};")
    
    lines.append("}")
    return "\n".join(lines)


def generate_typescript_file(schemas: dict, module_name: str, output_dir: Path) -> Path:
    """Generate TypeScript file with all interfaces"""
    lines = [
        "/**",
        f" * Auto-generated TypeScript interfaces for {module_name} module",
        f" * Generated from FastAPI OpenAPI schema",
        " * DO NOT EDIT MANUALLY - Run validate_api_contract.py to regenerate",
        " */",
        "",
    ]
    
    for name, schema in schemas.items():
        interface = schema_to_typescript_interface(name, schema, schemas)
        lines.append(interface)
        lines.append("")
    
    output_file = output_dir / f"{module_name}-api-types.ts"
    output_file.write_text("\n".join(lines), encoding="utf-8")
    return output_file


def validate_existing_types(generated_file: Path, existing_file: Path) -> list[str]:
    """Compare generated types with existing types and report differences"""
    if not existing_file.exists():
        return [f"⚠️ No existing types file found at {existing_file}"]
    
    generated = generated_file.read_text()
    existing = existing_file.read_text()
    
    if generated == existing:
        return ["✅ Types are in sync"]
    
    # Simple line-by-line diff
    gen_lines = set(generated.splitlines())
    exist_lines = set(existing.splitlines())
    
    added = gen_lines - exist_lines
    removed = exist_lines - gen_lines
    
    diffs = []
    if added:
        diffs.append(f"➕ New lines in schema ({len(added)} lines)")
    if removed:
        diffs.append(f"➖ Removed from schema ({len(removed)} lines)")
    
    return diffs or ["✅ Types are identical"]


def main():
    parser = argparse.ArgumentParser(description="Generate and validate TypeScript types from FastAPI OpenAPI")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--module", help="Specific module to generate types for (optional)")
    parser.add_argument("--output-dir", default="frontend/src/app", help="Output directory")
    parser.add_argument("--validate-only", action="store_true", help="Only validate, don't generate")
    
    args = parser.parse_args()
    
    print(f"🔍 Fetching OpenAPI schema from {args.backend_url}...")
    openapi = fetch_openapi_schema(args.backend_url)
    
    print(f"📋 API Title: {openapi.get('info', {}).get('title', 'Unknown')}")
    print(f"📋 API Version: {openapi.get('info', {}).get('version', 'Unknown')}")
    
    schemas = extract_module_schemas(openapi, args.module)
    print(f"📦 Found {len(schemas)} schemas" + (f" for module '{args.module}'" if args.module else ""))
    
    if not schemas:
        print("⚠️ No schemas found. Exiting.")
        sys.exit(0)
    
    output_dir = Path(args.output_dir)
    if args.module:
        output_dir = output_dir / args.module
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    module_name = args.module or "api"
    generated_file = generate_typescript_file(schemas, module_name, output_dir)
    
    print(f"✅ Generated: {generated_file}")
    
    # Check for existing manual types
    existing_file = output_dir / f"{module_name}.model.ts"
    diffs = validate_existing_types(generated_file, existing_file)
    for diff in diffs:
        print(f"   {diff}")
    
    print("\n📁 Next steps:")
    print(f"   1. Review generated file: {generated_file}")
    print(f"   2. If valid, update {module_name}.model.ts or import from generated file")
    print(f"   3. Run: ng build to verify TypeScript compilation")


if __name__ == "__main__":
    main()

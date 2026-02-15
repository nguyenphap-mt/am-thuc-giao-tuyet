#!/usr/bin/env python3
"""
Recommendation 1: AI-Powered Domain Agent Generation
Auto-generates domain agent prompts for new modules based on entity definitions.

Usage:
    python .agent/scripts/generate_domain_agent.py <module_name> --entities="Entity1,Entity2"
    python .agent/scripts/generate_domain_agent.py inventory --entities="Item,Warehouse,StockMovement"
"""

import argparse
import os
from pathlib import Path
from datetime import datetime

# Template for domain agent prompt
DOMAIN_AGENT_TEMPLATE = '''---
name: {module_name_title} Domain Agent
description: Chuyên gia về module {module_name_title} trong hệ thống Catering ERP
version: 1.0
generated_at: {timestamp}
---

# {module_name_title} Domain Agent

## Module Overview
Module **{module_name_title}** quản lý các nghiệp vụ liên quan đến:
{entity_descriptions}

## Core Entities

{entity_definitions}

## Business Rules

### Data Integrity
- Tất cả entities PHẢI có `tenant_id` (Multi-tenant RLS)
- UUID cho primary keys
- Timestamps: `created_at`, `updated_at`

### Validation Rules
{validation_rules}

## API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
{api_endpoints}

## Integration Points

### Depends On
- (TBD - Specify dependent modules)

### Depended By  
- (TBD - Specify modules that depend on this)

## Permission Matrix

| Action | admin | manager | staff |
|:-------|:-----:|:-------:|:-----:|
| View All | ✅ | ✅ | ❌ |
| View Own | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |

## Related Files
- Backend: `backend/modules/{module_name}/`
- Frontend: `frontend/src/app/{module_name}/`
- Migration: `migrations/*_{module_name}*.sql`
- API Contract: `.agent/api-contracts.md` (search for {module_name})
'''

UI_AGENT_TEMPLATE = '''---
name: {module_name_title} UI Agent  
description: Chuyên gia về UI/UX cho module {module_name_title}
version: 1.0
generated_at: {timestamp}
---

# {module_name_title} UI Agent

## Component Structure

```
frontend/src/app/{module_name}/
├── {module_name}.component.ts       # List view (standalone)
├── {module_name}.component.html
├── {module_name}.component.scss
├── {module_name}.service.ts         # API service
├── {module_name}.model.ts           # TypeScript interfaces
├── [id]/
│   └── {module_name}-detail.component.ts
├── create/
│   └── {module_name}-create.component.ts
└── components/
    ├── {module_name}-list/          # AG Grid list
    ├── {module_name}-form/          # Create/Edit form
    └── {module_name}-card/          # Card component
```

## TypeScript Interfaces

```typescript
{typescript_interfaces}
```

## UI Patterns

### List View
- AG Grid with server-side pagination
- Search by: {search_fields}
- Filters: status, date range, category
- Bulk actions: Export, Delete

### Create/Edit Form
- Wizard or single-page based on complexity
- Validation: Required fields, format checks
- Auto-save draft (optional)

### Detail View
- Card-based layout
- Action buttons: Edit, Delete, Status change
- Related entities tabs

## Design System Compliance
- **Framework**: Detect from project (Angular/Next.js/React Native)
- **Theme**: Light mode default
- **Icons**: Material Icons Filled
- **Loading**: Skeleton loaders
- **i18n**: Vietnamese default, English secondary

## Accessibility (WCAG 2.1)
- Focus management
- Keyboard navigation
- ARIA labels on interactive elements
- Color contrast 4.5:1 minimum
'''


def generate_entity_descriptions(entities: list[str]) -> str:
    """Generate bullet list of entity descriptions"""
    return "\n".join([f"- **{e}**: Quản lý thông tin {e.lower()}" for e in entities])


def generate_entity_definitions(entities: list[str]) -> str:
    """Generate entity schema templates"""
    definitions = []
    for entity in entities:
        definition = f'''### {entity}
```python
class {entity}:
    id: UUID
    tenant_id: UUID
    # Core fields - TODO: Define specific fields
    name: str
    status: str = "ACTIVE"
    created_at: datetime
    updated_at: datetime
```
'''
        definitions.append(definition)
    return "\n".join(definitions)


def generate_validation_rules(entities: list[str]) -> str:
    """Generate validation rules templates"""
    rules = []
    for entity in entities:
        rules.append(f"- **{entity}**: Name required, Status in ['ACTIVE', 'INACTIVE']")
    return "\n".join(rules)


def generate_api_endpoints(module_name: str, entities: list[str]) -> str:
    """Generate API endpoint table"""
    primary_entity = entities[0] if entities else module_name
    endpoints = [
        f"| GET | `/api/{module_name}` | List all {primary_entity.lower()}s |",
        f"| GET | `/api/{module_name}/{{id}}` | Get {primary_entity.lower()} by ID |",
        f"| POST | `/api/{module_name}` | Create new {primary_entity.lower()} |",
        f"| PUT | `/api/{module_name}/{{id}}` | Update {primary_entity.lower()} |",
        f"| DELETE | `/api/{module_name}/{{id}}` | Delete {primary_entity.lower()} |",
        f"| GET | `/api/{module_name}/stats` | Get module statistics |",
    ]
    return "\n".join(endpoints)


def generate_typescript_interfaces(entities: list[str]) -> str:
    """Generate TypeScript interface templates"""
    interfaces = []
    for entity in entities:
        interface = f'''export interface {entity} {{
  id: string;
  tenantId: string;
  name: string;
  status: '{entity.upper()}_STATUS';
  createdAt: Date;
  updatedAt: Date;
}}

export interface {entity}Create {{
  name: string;
  // Add other required fields
}}

export interface {entity}Update extends Partial<{entity}Create> {{}}
'''
        interfaces.append(interface)
    return "\n".join(interfaces)


def generate_search_fields(entities: list[str]) -> str:
    """Generate search field suggestions"""
    return "name, code, status"


def main():
    parser = argparse.ArgumentParser(description="Generate domain agent prompts for a new module")
    parser.add_argument("module_name", help="Name of the module (lowercase, e.g., 'inventory')")
    parser.add_argument("--entities", required=True, help="Comma-separated list of entities (e.g., 'Item,Warehouse')")
    parser.add_argument("--output-dir", default=".agent/prompts/modules", help="Output directory for prompts")
    
    args = parser.parse_args()
    
    module_name = args.module_name.lower()
    module_name_title = module_name.replace("_", " ").title()
    entities = [e.strip() for e in args.entities.split(",")]
    output_dir = Path(args.output_dir)
    
    # Create output directory if not exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Generate domain agent prompt
    domain_content = DOMAIN_AGENT_TEMPLATE.format(
        module_name=module_name,
        module_name_title=module_name_title,
        timestamp=timestamp,
        entity_descriptions=generate_entity_descriptions(entities),
        entity_definitions=generate_entity_definitions(entities),
        validation_rules=generate_validation_rules(entities),
        api_endpoints=generate_api_endpoints(module_name, entities)
    )
    
    domain_file = output_dir / f"{module_name}.md"
    domain_file.write_text(domain_content, encoding="utf-8")
    print(f"✅ Generated: {domain_file}")
    
    # Generate UI agent prompt
    ui_content = UI_AGENT_TEMPLATE.format(
        module_name=module_name,
        module_name_title=module_name_title,
        timestamp=timestamp,
        typescript_interfaces=generate_typescript_interfaces(entities),
        search_fields=generate_search_fields(entities)
    )
    
    ui_file = output_dir / f"{module_name}-ui.md"
    ui_file.write_text(ui_content, encoding="utf-8")
    print(f"✅ Generated: {ui_file}")
    
    print(f"\n📁 Files created in: {output_dir.absolute()}")
    print(f"   - {module_name}.md (Domain Agent)")
    print(f"   - {module_name}-ui.md (UI Agent)")


if __name__ == "__main__":
    main()

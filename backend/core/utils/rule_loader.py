import os
from typing import Optional
from pathlib import Path
from functools import lru_cache

class RuleLoader:
    # Assuming the app runs from d:\PROJECT\AM THUC GIAO TUYET or backend/
    # We will try to find the prompts directory dynamically or hardcode the project root relative path
    PROJECT_ROOT = Path(__file__).resolve().parents[3] # core -> backend -> PROJECT_ROOT
    RULES_DIR = PROJECT_ROOT / "prompts" / "rules"
    
    @classmethod
    @lru_cache(maxsize=10)
    def load(cls, rule_file: str) -> str:
        """
        Load rule content from markdown file.
        rule_file: e.g., 'database.md' or 'core.md'
        """
        file_path = cls.RULES_DIR / rule_file
        
        if not file_path.exists():
            # Fallback for dev/testing environment if paths differ
            # Try looking up from current working directory
            cwd = Path.cwd()
            file_path_alt = cwd / "prompts" / "rules" / rule_file
            if file_path_alt.exists():
                file_path = file_path_alt
            else:
                return f"[WARNING] Rule file not found: {rule_file}"

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"[ERROR] Failed to load rule {rule_file}: {str(e)}"

    @classmethod
    def get_core_rules(cls) -> str:
        return cls.load("core.md")

    @classmethod
    def get_database_rules(cls) -> str:
        return cls.load("database.md")
    
    @classmethod
    def get_frontend_rules(cls) -> str:
        return cls.load("frontend.md")
    
    @classmethod
    def get_security_rules(cls) -> str:
        return cls.load("security.md")

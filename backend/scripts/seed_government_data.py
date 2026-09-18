"""Load categories, geography and all government datasets. Idempotent.
Run: python -m scripts.seed_government_data
"""
from app.db.session import SessionLocal
from app.ingestion import loaders

with SessionLocal() as db:
    print("categories:", loaders.load_categories(db))
    print("districts:", len(loaders.load_geography_gujarat(db)))
    print("infrastructure rows:", loaders.load_infrastructure(db))
    print("projects:", loaders.load_projects(db))
    print("investment rows:", loaders.load_investment(db))
    print("national priorities:", loaders.load_national_priorities(db))
    db.commit()

"""Load the category taxonomy, all of India from the real Census 2011 files, and the pilot-state
project and budget data. Idempotent.
Run: python3.12 -m scripts.seed_government_data
"""
from app.db.session import SessionLocal
from app.ingestion import india_loader, loaders

with SessionLocal() as db:
    print("categories:", loaders.load_categories(db))
    stats = india_loader.load_india(db)
    print(f"geography: {stats['states']} states/UTs, {stats['districts']} districts "
          f"({stats['with_geometry']} with boundaries, {stats['without_geometry']} without)")
    print("projects:", loaders.load_projects(db))
    print("investment rows:", loaders.load_investment(db))
    print("national priorities:", loaders.load_national_priorities(db))
    db.commit()

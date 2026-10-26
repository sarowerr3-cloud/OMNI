from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models so Base.metadata contains all tables
from backend.app.models.user import User  # noqa: F401, E402
from backend.app.models.customer import Customer, CustomerOrder  # noqa: F401, E402

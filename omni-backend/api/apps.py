from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        # Phase 2: uncomment to load the model at server startup
        # from api.recommender import load_model
        # load_model()
        pass

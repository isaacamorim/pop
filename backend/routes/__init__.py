# routes/__init__.py

from .pop_templates import bp_templates
from .pop_versions import bp_versions
from .pop_steps import bp_steps
from .pop_attachments import bp_attachments
from .pop_links import bp_links
from .pop_instances import bp_instances
from .pop_services import bp_services
from .lookups import bp_lookups
from .pops import bp
from .auth import bp_auth


def register_blueprints(app):
    app.register_blueprint(bp_templates)
    app.register_blueprint(bp_versions)
    app.register_blueprint(bp_steps)
    app.register_blueprint(bp_attachments)
    app.register_blueprint(bp_links)
    app.register_blueprint(bp_instances)
    app.register_blueprint(bp_services)
    app.register_blueprint(bp_lookups)
    app.register_blueprint(bp)
    app.register_blueprint(bp_auth)

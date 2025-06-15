from jinja2 import Environment, PackageLoader
from weasyprint import HTML

from core.db.models import Incasso

__all__ = ["generate_incasso_pdf"]


def _get_html_for_envelope(incasso: Incasso) -> str:
    env = Environment(loader=PackageLoader("incasso", "templates"))
    template = env.get_template("busta.j2")
    ctx = {"incasso": incasso}
    return template.render(**ctx)


def generate_incasso_pdf(incasso: Incasso) -> HTML:
    return HTML(string=_get_html_for_envelope(incasso=incasso))

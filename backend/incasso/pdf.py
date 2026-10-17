import base64
from datetime import datetime

from jinja2 import Environment, PackageLoader, Template
from weasyprint import HTML

from core.db.models import Incasso

__all__ = [
    "generate_incasso_pdf",
    "generate_riepilogo_pdf",
]


def _load_template(template_name: str) -> Template:
    env = Environment(loader=PackageLoader("incasso", "templates"))
    return env.get_template(template_name)


def _get_html_for_envelope(incasso: Incasso) -> str:
    # env = Environment(loader=PackageLoader("incasso", "templates"))
    template = _load_template("busta.j2")
    ctx = {"incasso": incasso}
    return template.render(**ctx)


def _get_html_for_riepologo(images: list[tuple[str, bytes]]) -> str:
    """
    :param images: The MIME type and the bytes of each image, as checked by
        `incasso.images.read_images`: the type comes from the content, never
        from the client
    """
    template = _load_template("riepilogo.j2")
    uri_list = [
        f"data:{mime_type};base64,{base64.b64encode(data).decode('ascii')}"
        for mime_type, data in images
    ]

    today = datetime.today().strftime("%d/%m/%Y")
    ctx = {
        "current_date": today,
        "uri_list": uri_list,
    }
    return template.render(**ctx)


def generate_incasso_pdf(incasso: Incasso) -> HTML:
    return HTML(string=_get_html_for_envelope(incasso=incasso))


def generate_riepilogo_pdf(images: list[tuple[str, bytes]]) -> HTML:
    return HTML(string=_get_html_for_riepologo(images=images))

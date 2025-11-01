import base64
from datetime import datetime

from fastapi import UploadFile
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


def _get_html_for_riepologo(list_of_images: list[UploadFile]) -> str:
    template = _load_template("riepilogo.j2")
    uri_list = []
    for image in list_of_images:
        image_bytes = image.file.read()

        # Encode image to base64
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")

        # Determine MIME type (e.g., image/png, image/jpeg)
        mime_type = image.content_type

        # Create data URI
        image_data_uri = f"data:{mime_type};base64,{encoded_image}"
        uri_list.append(image_data_uri)

    today = datetime.today().strftime("%d/%m/%Y")
    ctx = {
        "current_date": today,
        "uri_list": uri_list,
    }
    return template.render(**ctx)


def generate_incasso_pdf(incasso: Incasso) -> HTML:
    return HTML(string=_get_html_for_envelope(incasso=incasso))


def generate_riepilogo_pdf(list_of_images: list[UploadFile]) -> HTML:
    return HTML(string=_get_html_for_riepologo(list_of_images=list_of_images))

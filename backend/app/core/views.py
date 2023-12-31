from django.shortcuts import render

__all__ = ["home"]


def home(request):
    """
    View that shows a base homepage
    :param request:
    :return: The home.html template to render
    """
    return render(request, "home.html")

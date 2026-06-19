class NoIndexMiddleware:
    """Injects X-Robots-Tag on every response.

    This platform is a private family archive and must never be indexed,
    regardless of whatever robots.txt rules a crawler may or may not respect.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Robots-Tag'] = 'noindex, nofollow'
        return response

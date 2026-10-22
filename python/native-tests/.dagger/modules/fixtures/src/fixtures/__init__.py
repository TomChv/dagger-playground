from dagger import function, object_type
from dagger_clients.core import Service, core


@object_type
class Fixtures:
    @function
    def greeting(self, name: str) -> str:
        return f"Hello, {name}!"

    @function
    def http_server(self, body: str = "pong") -> Service:
        return (
            core()
            .container()
            .from_("nginx:1.27-alpine")
            .with_new_file("/usr/share/nginx/html/index.html", body)
            .with_exposed_port(80)
            .as_service()
        )

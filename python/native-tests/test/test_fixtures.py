from dagger_clients.core import Service, core
from dagger_clients.fixtures import fixtures


async def fetch_body(svc: Service) -> str:
    return await (
        core()
        .container()
        .from_("alpine:3.21")
        .with_service_binding("fixture", svc)
        .with_exec(["wget", "-qO-", "http://fixture"])
        .stdout()
    )


async def test_module_function_returns_to_native_process():
    assert await fixtures().greeting("native tests") == "Hello, native tests!"


async def test_module_service_answers_container():
    assert await fetch_body(fixtures().http_server(body="pong")) == "pong"

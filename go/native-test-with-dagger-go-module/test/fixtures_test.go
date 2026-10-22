package test

import (
	"context"
	"os"
	"testing"

	dagger "github.com/TomChv/dagger-playground/go/native-test-with-dagger-go-module/internal/dagger/clients/fixtures"
	"github.com/TomChv/dagger-playground/go/native-test-with-dagger-go-module/internal/dagger/clients/fixtures/dag"
)

func TestMain(m *testing.M) {
	code := m.Run()
	dag.Close()
	os.Exit(code)
}

func fetchBody(ctx context.Context, t *testing.T, svc *dagger.Service) string {
	t.Helper()

	body, err := dag.Container().
		From("alpine:3.21").
		WithServiceBinding("fixture", svc).
		WithExec([]string{"wget", "-qO-", "http://fixture"}).
		Stdout(ctx)
	if err != nil {
		t.Fatal(err)
	}
	return body
}

// Connect() serves the bound module eagerly and dag.initClient() panics when
// that fails, so inside another module's container this takes the core API
// down with it.
func TestCoreClientReachesTheEngine(t *testing.T) {
	out, err := dag.Container().
		From("alpine:3.21").
		WithExec([]string{"echo", "-n", "from the engine"}).
		Stdout(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if want := "from the engine"; out != want {
		t.Errorf("stdout = %q, want %q", out, want)
	}
}

func TestModuleFunctionReturnsToNativeProcess(t *testing.T) {
	got, err := dag.Fixtures().Greeting(t.Context(), "native tests")
	if err != nil {
		t.Fatal(err)
	}
	if want := "Hello, native tests!"; got != want {
		t.Errorf("greeting = %q, want %q", got, want)
	}
}

func TestModuleServiceAnswersContainer(t *testing.T) {
	svc := dag.Fixtures().Httpserver(dagger.FixturesHttpserverOpts{Body: "pong"})

	if got := fetchBody(t.Context(), t, svc); got != "pong" {
		t.Errorf("service body = %q, want %q", got, "pong")
	}
}

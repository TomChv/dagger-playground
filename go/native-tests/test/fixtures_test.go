package test

import (
	"context"
	"os"
	"testing"

	dagger "github.com/TomChv/dagger-playground/go/native-tests/internal/dagger/clients/fixtures"
	"github.com/TomChv/dagger-playground/go/native-tests/internal/dagger/clients/fixtures/dag"
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

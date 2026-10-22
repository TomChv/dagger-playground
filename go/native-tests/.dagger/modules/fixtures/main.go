package main

import (
	"fmt"

	"dagger/fixtures/internal/dagger"
)

type Fixtures struct{}

func (m *Fixtures) Greeting(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

func (m *Fixtures) HTTPServer(
	// +default="pong"
	body string,
) *dagger.Service {
	return dag.Container().
		From("nginx:1.27-alpine").
		WithNewFile("/usr/share/nginx/html/index.html", body).
		WithExposedPort(80).
		AsService()
}

package main

import "fmt"

type Runner struct{}

// Projects is keyed by directory path, the way a real test-framework module
// keys its projects. Its +get argument is named path, which is the only reason
// the CLI renders a PATH placeholder.
func (*Runner) Projects() *Projects {
	return &Projects{Paths: []string{"./api", "./web"}}
}

// Envs is the contrast: the same machinery, a +get argument named name.
func (*Runner) Envs() *Envs {
	return &Envs{Names: []string{"ci", "local"}}
}

// +collection
type Projects struct {
	// +keys
	Paths []string
}

// +get
func (projects *Projects) Project(path string) *Project { return &Project{Path: path} }

type Project struct{ Path string }

// Suites is the second dimension: a project holds several suites, so one
// dimension cannot pin a single check — both are needed.
func (project *Project) Suites() *Suites {
	return &Suites{Project: project.Path, Files: []string{"e2e.test.ts", "unit.test.ts"}}
}

// +collection
type Suites struct {
	Project string
	// +keys
	Files []string
}

// +get
func (suites *Suites) Suite(file string) *Suite {
	return &Suite{Project: suites.Project, File: file}
}

type Suite struct {
	Project string
	File    string
}

// +check
func (suite *Suite) Run() error {
	if suite.File == "" || suite.Project == "" {
		return fmt.Errorf("suite is not pinned: project=%q file=%q", suite.Project, suite.File)
	}
	return nil
}

// +collection
type Envs struct {
	// +keys
	Names []string
}

// +get
func (envs *Envs) Env(name string) *Env { return &Env{Name: name} }

type Env struct{ Name string }

// +check
func (env *Env) Ready() error { return nil }

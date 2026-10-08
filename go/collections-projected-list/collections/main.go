package main

type Collections struct{}

// Items is the dagger/dagger#14447 repro: its item type is reachable only
// through get, so nothing the author wrote mentions a list of Item.
func (*Collections) Items() *Items {
	return &Items{Names: []string{"b", "a", "c"}, Prefix: "item:"}
}

// Letters is the control: All returns a list of the item type, so that list
// entered the type closure even before the fix.
func (*Collections) Letters() *Letters {
	return &Letters{Keys: []string{"x", "y"}}
}

// +collection
type Items struct {
	// +keys
	Names  []string
	Prefix string
}

// +get
func (items *Items) Lookup(name string) *Item { return &Item{Name: items.Prefix + name} }

// Selected is hidden by the projection; consumers reach it through the batch type.
func (items *Items) Selected() []string { return items.Names }

type Item struct{ Name string }

// Parts nests a collection under an item, again reachable only through get.
func (item *Item) Parts() *Parts { return &Parts{Keys: []string{"left", "right"}} }

// +collection
type Parts struct{ Keys []string }

func (*Parts) Get(key string) *Part { return &Part{Name: key} }

type Part struct{ Name string }

// +collection
type Letters struct{ Keys []string }

func (*Letters) Get(key string) *Letter { return &Letter{Value: key} }

func (letters *Letters) All() []*Letter {
	all := make([]*Letter, 0, len(letters.Keys))
	for _, key := range letters.Keys {
		all = append(all, &Letter{Value: key})
	}
	return all
}

type Letter struct{ Value string }

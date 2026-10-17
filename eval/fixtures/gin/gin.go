package gin

type Engine struct {
    RouterGroup
    trees methodTrees
}

func New() *Engine {
    return &Engine{}
}

func Default() *Engine {
    engine := New()
    return engine
}

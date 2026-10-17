package gin

type node struct {
    path     string
    indices  string
    handlers []func()
}

package binding

type Binding interface {
    Name() string
    Bind(req any, obj any) error
}

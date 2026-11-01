package gin

type Context struct {
    Request string
    Writer  string
}

func (c *Context) JSON(code int, obj any) {}

func (c *Context) Query(key string) string {
    return ""
}

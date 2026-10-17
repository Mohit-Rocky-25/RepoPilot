package gin

type Context struct {
    Request string
    Writer  string
}

func (c *Context) JSON(code int, obj any) {}

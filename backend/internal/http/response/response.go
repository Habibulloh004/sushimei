package response

import "github.com/gofiber/fiber/v2"

type Envelope struct {
	Data  any `json:"data,omitempty"`
	Meta  any `json:"meta,omitempty"`
	Error any `json:"error,omitempty"`
}

type APIError struct {
	Message string `json:"message"`
	Detail  any    `json:"detail,omitempty"`
}

func OK(c *fiber.Ctx, code int, data any, meta any) error {
	return c.Status(code).JSON(Envelope{Data: data, Meta: meta})
}

func Fail(c *fiber.Ctx, code int, message string, detail any) error {
	return c.Status(code).JSON(Envelope{Error: APIError{Message: message, Detail: detail}})
}

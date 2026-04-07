package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"sushimei/backend/internal/http/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RequestCustomerOTP(c *fiber.Ctx) error {
	var req RequestOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	out, err := h.service.RequestOTP(c.Context(), req.Phone)
	if err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "failed to request otp", err.Error())
	}

	return response.OK(c, fiber.StatusOK, out, nil)
}

func (h *Handler) VerifyCustomerOTP(c *fiber.Ctx) error {
	var req VerifyOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		code = strings.TrimSpace(req.OTPCode)
	}

	out, err := h.service.VerifyCustomerOTP(c.Context(), req.Phone, code)
	if err != nil {
		return response.Fail(c, fiber.StatusUnauthorized, "otp verification failed", err.Error())
	}

	return response.OK(c, fiber.StatusOK, out, nil)
}

func (h *Handler) EmployeeLogin(c *fiber.Ctx) error {
	var req EmployeeLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	out, err := h.service.EmployeeLogin(c.Context(), req.Email, req.Password)
	if err != nil {
		return response.Fail(c, fiber.StatusUnauthorized, "login failed", err.Error())
	}

	return response.OK(c, fiber.StatusOK, out, nil)
}

func (h *Handler) CustomerLogin(c *fiber.Ctx) error {
	var req CustomerLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	out, err := h.service.CustomerLogin(c.Context(), req.Phone, req.Password)
	if err != nil {
		return response.Fail(c, fiber.StatusUnauthorized, "login failed", err.Error())
	}

	return response.OK(c, fiber.StatusOK, out, nil)
}

func (h *Handler) CustomerRegister(c *fiber.Ctx) error {
	var req CustomerRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	out, err := h.service.CustomerRegister(c.Context(), req.Phone, req.Password)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), ErrCustomerAlreadyExists.Error()) {
			return response.OK(c, fiber.StatusOK, fiber.Map{"exists": true}, nil)
		}
		return response.Fail(c, fiber.StatusBadRequest, "registration failed", err.Error())
	}

	return response.OK(c, fiber.StatusCreated, out, nil)
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Fail(c, fiber.StatusBadRequest, "invalid request body", err.Error())
	}

	out, err := h.service.RefreshTokens(c.Context(), req.RefreshToken)
	if err != nil {
		return response.Fail(c, fiber.StatusUnauthorized, "failed to refresh token", err.Error())
	}

	return response.OK(c, fiber.StatusOK, out, nil)
}

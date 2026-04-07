package auth

type RequestOTPRequest struct {
	Phone string `json:"phone"`
}

type VerifyOTPRequest struct {
	Phone   string `json:"phone"`
	Code    string `json:"code"`
	OTPCode string `json:"otp_code"`
}

type CustomerLoginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type CustomerRegisterRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type EmployeeLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type TokenPairResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresInSec int64  `json:"expires_in_sec"`
}

type OTPResponse struct {
	Message string `json:"message"`
	OTPCode string `json:"otp_code,omitempty"`
	Debug   any    `json:"debug,omitempty"`
}

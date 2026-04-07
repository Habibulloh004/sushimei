FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/api ./cmd/api

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /bin/api /app/api
COPY docs /app/docs
EXPOSE 8080
CMD ["/app/api"]

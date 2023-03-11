package main

import (
	"github.com/joho/godotenv"
	"os"
)

func main() {
	godotenv.Load()
	svc := os.Getenv("SVC")
	switch svc {
	case "espn":
		espn()
	case "jhowell":
		jhowell()
	default:
		// api()
	}
}

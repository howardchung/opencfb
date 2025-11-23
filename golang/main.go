package main

import (
	"os"
)

func main() {
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

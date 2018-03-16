package main

import (
	"os"
)

func main() {
	svc := os.Getenv("SVC")
	switch svc {
	case "api":
		api()
	case "espn":
		espn()
	case "jhowell":
		jhowell()
	}
}

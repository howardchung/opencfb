package main

import (
	// "database/sql"
	// "encoding/json"
	"fmt"
	"golang.org/x/net/html"
	// "io/ioutil"
	"log"
	"net/http"
	// "os"
	"strings"
	// "time"
	// _ "github.com/mattn/go-sqlite3"
)

func main() {
	resp, err := http.Get("http://www.jhowell.net/cf/scores/byName.htm")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
	doc, err := html.Parse(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" && n.Parent.Data == "p" {
			for _, a := range n.Attr {
				if a.Key == "href" && a.Val != "ScoresIndex.htm" {
					readScores(a.Val)
					break
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)
}

func readScores(pageName string) {
	resp, err := http.Get("http://www.jhowell.net/cf/scores/" + pageName)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
	doc, err := html.Parse(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	var year string
	var f func(*html.Node)
	f = func(n *html.Node) {
		// we have the school name from the pagename

		// get the year
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, a := range n.Attr {
				if a.Key == "name" {
					year = a.Val
					break
				}
			}
		}
		// new line
		if n.Type == html.ElementNode && n.Data == "tr" {
			fmt.Println("")
			s := strings.Split(pageName, ".htm")
			schoolName := s[0]
			fmt.Print(schoolName + "," + year + ",")
		}
		if n.Type == html.ElementNode && n.Data == "td" {
			for _, a := range n.Attr {
				// fmt.Println(os.Stderr, a.Key, a.Val)
				if a.Key == "bgcolor" {
					// if first child a link, extract the link url and get the school name from it
					if n.FirstChild.Data == "a" {
						for _, a := range n.FirstChild.Attr {
							if a.Key == "href" {
								s := strings.Split(a.Val, ".htm")
								schoolName := s[0]
								fmt.Print(schoolName + ",")
							}
						}
					} else {
						fmt.Print(string(n.FirstChild.Data) + ",")
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(doc)
}

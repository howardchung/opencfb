/* Downloads data from jhowell and writes to a CSV file */
package main

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"strings"

	"golang.org/x/net/html"
)

func JHowellFetcher(filename string) {
	file, err := os.Create(filename)
	if err != nil {
		panic(err.Error())
	}
	w := bufio.NewWriter(file)
	defer file.Close()
	resp, err := http.Get("http://www.jhowell.net/cf/scores/byName.htm")
	if err != nil {
		panic(err.Error())
	}
	defer resp.Body.Close()
	doc, err := html.Parse(resp.Body)
	if err != nil {
		panic(err.Error())
	}
	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" && n.Parent.Data == "p" {
			for _, a := range n.Attr {
				if a.Key == "href" && a.Val != "ScoresIndex.htm" {
					readScores(w, a.Val)
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

func readScores(w *bufio.Writer, pageName string) {
	resp, err := http.Get("http://www.jhowell.net/cf/scores/" + pageName)
	if err != nil {
		panic(err.Error())
	}
	defer resp.Body.Close()
	doc, err := html.Parse(resp.Body)
	if err != nil {
		panic(err.Error())
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
			fmt.Fprint(w, "")
			s := strings.Split(pageName, ".htm")
			schoolName := s[0]
			fmt.Fprint(w, schoolName+","+year+",")
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
								fmt.Fprint(w, schoolName+",")
							}
						}
					} else {
						fmt.Fprint(w, string(n.FirstChild.Data)+",")
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

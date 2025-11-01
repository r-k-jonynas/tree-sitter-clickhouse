package tree_sitter_clickhouse_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_clickhouse "github.com/tree-sitter/tree-sitter-clickhouse/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_clickhouse.Language())
	if language == nil {
		t.Errorf("Error loading Clickhouse grammar")
	}
}

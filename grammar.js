/**
 * @file parser for clickhouse queries and ddl
 * @author rkj
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "clickhouse",

  extras: $ => [/\s/, $.comment],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.create_table_statement
    ),

    create_table_statement: $ => seq(
      "CREATE",
      "TABLE",
      optional(seq("IF", "NOT", "EXISTS")),
      $.qualified_table_name,
      "(",
      commaSep1($.column_definition),
      ")",
      "ENGINE",
      "=",
      $.engine_name,
      optional($.engine_parameters),
      repeat($.table_clause)
    ),

    qualified_table_name: $ => choice(
      seq($.identifier, ".", $.identifier),
      $.identifier
    ),

    column_definition: $ => seq(
      $.identifier,
      $._data_type,
      optional($.column_modifier),
      optional(seq("COMMENT", $.string_literal))
    ),

    column_modifier: $ => choice(
      seq("DEFAULT", $._expression),
      seq("MATERIALIZED", $._expression),
      seq("ALIAS", $._expression),
      seq("CODEC", $.codec_expression),
      seq("TTL", $._expression)
    ),

    _data_type: $ => choice(
      $.primitive_type,
      $.complex_type
    ),

    primitive_type: $ => choice(
      "UInt8", "UInt16", "UInt32", "UInt64",
      "Int8", "Int16", "Int32", "Int64",
      "Float32", "Float64",
      "String", "FixedString",
      "Date", "Date32", "DateTime", "DateTime64",
      "UUID", "IPv4", "IPv6",
      "Bool", "Boolean",
      "Decimal32", "Decimal64", "Decimal128", "Decimal256",
      "Enum8", "Enum16"
    ),

    complex_type: $ => choice(
      seq("Array", "(", $._data_type, ")"),
      seq("Tuple", "(", commaSep($._data_type), ")"),
      seq("Map", "(", $._data_type, ",", $._data_type, ")"),
      seq("Nested", "(", commaSep1($.column_definition), ")"),
      seq("Nullable", "(", $._data_type, ")")
    ),

    engine_name: $ => choice(
      "MergeTree",
      "ReplacingMergeTree",
      "SummingMergeTree",
      "AggregatingMergeTree",
      "CollapsingMergeTree",
      "VersionedCollapsingMergeTree",
      "GraphiteMergeTree",
      "TinyLog",
      "Log",
      "StripeLog",
      "Memory",
      "Set",
      "Join",
      "Buffer",
      "Dictionary",
      "Distributed",
      "MaterializedView",
      "View",
      "Null",
      "File",
      "URL",
      "MySQL",
      "ODBC",
      "JDBC",
      "S3",
      "Kafka",
      "RabbitMQ",
      "PostgreSQL",
      "SQLite",
      "HDFS"
    ),

    engine_parameters: $ => seq(
      "(",
      commaSep($._expression),
      ")"
    ),

    table_clause: $ => choice(
      seq("PARTITION", "BY", $._expression),
      seq("ORDER", "BY", $._expression),
      seq("PRIMARY", "KEY", $._expression),
      seq("SAMPLE", "BY", $._expression),
      seq("TTL", $._expression),
      seq("SETTINGS", $.settings_list),
      seq("COMMENT", $.string_literal)
    ),

    settings_list: $ => seq(
      $.setting_pair,
      repeat(seq(",", $.setting_pair))
    ),

    setting_pair: $ => seq(
      $.identifier,
      "=",
      $._expression
    ),

    codec_expression: $ => choice(
      $.identifier,
      seq($.identifier, "(", $._expression, ")")
    ),

    // Expressions
    _expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.function_call,
      $.parenthesized_expression,
      $.array_expression,
      $.cast_expression,
      $.identifier,
      $.number,
      $.string_literal
    ),

    binary_expression: $ => prec.left(1, seq(
      $._expression,
      choice(
        "+", "-", "*", "/", "%",
        "=", "!=", "<", ">", "<=", ">=",
        "AND", "OR", "LIKE", "IN",
        seq("IS", "NOT"),
        "IS"
      ),
      $._expression
    )),

    unary_expression: $ => prec.left(2, seq(
      choice("-", "+", "NOT"),
      $._expression
    )),

    function_call: $ => prec(1, seq(
      $.identifier,
      "(",
      optional(commaSep($._expression)),
      ")"
    )),

    parenthesized_expression: $ => seq(
      "(",
      $._expression,
      ")"
    ),

    array_expression: $ => seq(
      "[",
      optional(commaSep($._expression)),
      "]"
    ),

    cast_expression: $ => seq(
      choice("CAST", "::"),
      "(",
      $._expression,
      "AS",
      $._data_type,
      ")"
    ),

    // Tokens
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number: $ => /\d+(\.\d+)?([eE][+-]?\d+)?/,

    string_literal: $ => choice(
      seq("'", /([^'\\]|\\.)*/, "'"),
      seq('"', /([^"\\]|\\.)*/, '"')
    ),

    comment: $ => choice(
      seq("--", /.*/),
      seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "*/")
    )
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

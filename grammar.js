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

    _statement: $ => seq(
      choice(
        $.create_table_statement,
        $.select_statement,
        $.insert_statement
      ),
      optional(";")
    ),

    create_table_statement: $ => seq(
      case_insensitive("CREATE"),
      case_insensitive("TABLE"),
      optional(seq(case_insensitive("IF"), case_insensitive("NOT"), case_insensitive("EXISTS"))),
      $.qualified_table_name,
      "(",
      commaSep1($.column_definition),
      ")",
      case_insensitive("ENGINE"),
      "=",
      $.engine_name,
      optional($.engine_parameters),
      repeat($.table_clause)
    ),

    // SELECT statement
    select_statement: $ => seq(
      $.select_clause,
      $.from_clause,
      optional($.where_clause),
      optional($.group_by_clause),
      optional($.order_by_clause),
      optional($.limit_clause)
    ),

    select_clause: $ => seq(
      case_insensitive("SELECT"),
      commaSep1(choice(
        $.wildcard,
        $.aliased_expression,
        $._expression
      ))
    ),

    from_clause: $ => seq(
      case_insensitive("FROM"),
      $.identifier  // table name
    ),

    where_clause: $ => seq(
      case_insensitive("WHERE"),
      $._expression
    ),

    group_by_clause: $ => seq(
      case_insensitive("GROUP"),
      case_insensitive("BY"),
      commaSep1($._expression)
    ),

    order_by_clause: $ => seq(
      case_insensitive("ORDER"),
      case_insensitive("BY"),
      commaSep1($._expression)
    ),

    limit_clause: $ => seq(
      case_insensitive("LIMIT"),
      $.number
    ),

    aliased_expression: $ => seq(
      $._expression,
      case_insensitive("AS"),
      $.identifier
    ),

    wildcard: $ => "*",

    // INSERT statement
    insert_statement: $ => seq(
      case_insensitive("INSERT"),
      case_insensitive("INTO"),
      $.identifier,  // table name
      optional($.column_list),
      choice(
        $.values_clause,
        $.select_statement,
        $.format_clause
      )
    ),

    column_list: $ => seq(
      "(",
      commaSep1($.identifier),
      ")"
    ),

    values_clause: $ => seq(
      case_insensitive("VALUES"),
      commaSep1($.value_list)
    ),

    value_list: $ => seq(
      "(",
      commaSep1($._expression),
      ")"
    ),

    format_clause: $ => seq(
      case_insensitive("FORMAT"),
      $.identifier  // format name (CSV, JSON, etc.)
    ),

    qualified_table_name: $ => choice(
      seq($.identifier, ".", $.identifier),
      $.identifier
    ),

    column_definition: $ => seq(
      $.identifier,
      $._data_type,
      optional($.column_modifier),
      optional(seq(case_insensitive("COMMENT"), $.string_literal))
    ),

    column_modifier: $ => choice(
      seq(case_insensitive("DEFAULT"), $._expression),
      seq(case_insensitive("MATERIALIZED"), $._expression),
      seq(case_insensitive("ALIAS"), $._expression),
      seq(case_insensitive("CODEC"), $.codec_expression),
      seq(case_insensitive("TTL"), $._expression)
    ),

    _data_type: $ => choice(
      $.primitive_type,
      $.complex_type
    ),

    // Type names are case-sensitive (except DateTime which is explicitly case-insensitive in ClickHouse)
    primitive_type: $ => choice(
      "UInt8", "UInt16", "UInt32", "UInt64",
      "Int8", "Int16", "Int32", "Int64",
      "Float32", "Float64",
      "String", "FixedString",
      "Date", "Date32", case_insensitive("DateTime"), "DateTime64",
      "UUID", "IPv4", "IPv6",
      "Bool", "Boolean",
      "Decimal32", "Decimal64", "Decimal128", "Decimal256",
      "Enum8", "Enum16"
    ),

    // Complex type constructors are case-sensitive
    complex_type: $ => choice(
      seq("Array", "(", $._data_type, ")"),
      seq("Tuple", "(", commaSep($._data_type), ")"),
      seq("Map", "(", $._data_type, ",", $._data_type, ")"),
      seq("Nested", "(", commaSep1($.column_definition), ")"),
      seq("Nullable", "(", $._data_type, ")")
    ),

    // Engine names are case-sensitive (like type names, not SQL keywords)
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
      seq(case_insensitive("PARTITION"), case_insensitive("BY"), $._expression),
      seq(case_insensitive("ORDER"), case_insensitive("BY"), $._expression),
      seq(case_insensitive("PRIMARY"), case_insensitive("KEY"), $._expression),
      seq(case_insensitive("SAMPLE"), case_insensitive("BY"), $._expression),
      seq(case_insensitive("TTL"), $._expression),
      seq(case_insensitive("SETTINGS"), $.settings_list),
      seq(case_insensitive("COMMENT"), $.string_literal)
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
      $.interval_expression,
      $.identifier,
      $.number,
      $.string_literal
    ),

    interval_expression: $ => seq(
      case_insensitive("INTERVAL"),
      $.number,
      $.identifier  // DAY, MONTH, YEAR, HOUR, etc.
    ),

    binary_expression: $ => prec.left(1, seq(
      $._expression,
      choice(
        "+", "-", "*", "/", "%",
        "=", "!=", "<", ">", "<=", ">=",
        case_insensitive("AND"), case_insensitive("OR"), case_insensitive("LIKE"), case_insensitive("IN"),
        seq(case_insensitive("IS"), case_insensitive("NOT")),
        case_insensitive("IS")
      ),
      $._expression
    )),

    unary_expression: $ => prec.left(2, seq(
      choice("-", "+", case_insensitive("NOT")),
      $._expression
    )),

    function_call: $ => prec(1, seq(
      $.identifier,
      "(",
      optional(commaSep(choice($.wildcard, $._expression))),
      ")"
    )),

    parenthesized_expression: $ => seq(
      "(",
      commaSep1($._expression),
      ")"
    ),

    array_expression: $ => seq(
      "[",
      optional(commaSep($._expression)),
      "]"
    ),

    cast_expression: $ => seq(
      choice(case_insensitive("CAST"), "::"),
      "(",
      $._expression,
      case_insensitive("AS"),
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

// Case-insensitive keyword helper for matching any case combination of the word
// ClickHouse SQL keywords are case-insensitive
function case_insensitive(word) {
  return new RegExp(
    word.replace(/[a-zA-Z]/g, char => `[${char.toLowerCase()}${char.toUpperCase()}]`)
  );
}

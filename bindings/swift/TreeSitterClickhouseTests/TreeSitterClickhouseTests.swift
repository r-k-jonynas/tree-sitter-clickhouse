import XCTest
import SwiftTreeSitter
import TreeSitterClickhouse

final class TreeSitterClickhouseTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_clickhouse())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Clickhouse grammar")
    }
}

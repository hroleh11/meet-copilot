/// Paths are built by hand, so a search term with a space, a `&` or Cyrillic in
/// it has to be escaped before it becomes part of the query string.
pub fn escaped(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                char::from(byte).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::escaped;

    #[test]
    fn keeps_plain_words_and_escapes_everything_else() {
        assert_eq!(escaped("release"), "release");
        assert_eq!(
            escaped("дата релізу"),
            "%D0%B4%D0%B0%D1%82%D0%B0%20%D1%80%D0%B5%D0%BB%D1%96%D0%B7%D1%83"
        );
        assert_eq!(escaped("a&b=c"), "a%26b%3Dc");
    }
}

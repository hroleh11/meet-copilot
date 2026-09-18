#[derive(Debug, PartialEq, Eq)]
pub struct SseFrame {
    pub event: String,
    pub data: String,
}

#[derive(Debug, Default)]
pub struct SseParser {
    line: String,
    event: Option<String>,
    data: String,
}

impl SseParser {
    pub fn push(&mut self, chunk: &str) -> Vec<SseFrame> {
        let mut frames = Vec::new();

        for character in chunk.chars() {
            if character != '\n' {
                self.line.push(character);
                continue;
            }

            let line = std::mem::take(&mut self.line);

            if let Some(frame) = self.take_line(line.trim_end_matches('\r')) {
                frames.push(frame);
            }
        }

        frames
    }

    fn take_line(&mut self, line: &str) -> Option<SseFrame> {
        if line.is_empty() {
            return self.finish();
        }

        let (field, value) = match line.split_once(':') {
            Some((field, value)) => (field, value.strip_prefix(' ').unwrap_or(value)),
            None => (line, ""),
        };

        match field {
            "event" => self.event = Some(value.to_owned()),
            "data" => {
                if !self.data.is_empty() {
                    self.data.push('\n');
                }

                self.data.push_str(value);
            }
            _ => {}
        }

        None
    }

    fn finish(&mut self) -> Option<SseFrame> {
        let event = self.event.take()?;
        let data = std::mem::take(&mut self.data);

        Some(SseFrame { event, data })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(event: &str, data: &str) -> SseFrame {
        SseFrame {
            event: event.to_owned(),
            data: data.to_owned(),
        }
    }

    #[test]
    fn a_whole_frame_in_one_chunk_is_read() {
        let mut parser = SseParser::default();

        assert_eq!(
            parser.push("event: delta\ndata: {\"text\":\"привіт\"}\n\n"),
            vec![frame("delta", "{\"text\":\"привіт\"}")]
        );
    }

    #[test]
    fn a_frame_split_across_chunks_is_read_once_it_completes() {
        let mut parser = SseParser::default();

        assert!(parser.push("event: del").is_empty());
        assert!(parser.push("ta\ndata: {\"text\":\"a").is_empty());
        assert_eq!(
            parser.push("bc\"}\n\n"),
            vec![frame("delta", "{\"text\":\"abc\"}")]
        );
    }

    #[test]
    fn several_frames_in_one_chunk_arrive_in_order() {
        let mut parser = SseParser::default();

        assert_eq!(
            parser.push("event: delta\ndata: 1\n\nevent: delta\ndata: 2\n\n"),
            vec![frame("delta", "1"), frame("delta", "2")]
        );
    }

    #[test]
    fn carriage_returns_and_missing_spaces_are_tolerated() {
        let mut parser = SseParser::default();

        assert_eq!(
            parser.push("event:done\r\ndata:{}\r\n\r\n"),
            vec![frame("done", "{}")]
        );
    }

    #[test]
    fn comments_and_stray_fields_are_ignored() {
        let mut parser = SseParser::default();

        assert!(parser.push(": keep alive\n\n").is_empty());
        assert_eq!(
            parser.push("id: 7\nevent: delta\ndata: x\n\n"),
            vec![frame("delta", "x")]
        );
    }

    #[test]
    fn a_frame_without_an_event_name_is_dropped() {
        let mut parser = SseParser::default();

        assert!(parser.push("data: orphan\n\n").is_empty());
    }
}

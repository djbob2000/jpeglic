use img_parts::jpeg::Jpeg;
use img_parts::ImageEXIF;
use xmp_writer::XmpWriter;
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a dummy JPEG (or read an existing one if available, but for testing just minimal)
    // Actually, let's just use a real jpeg if we can find one, or just test the logic with a placeholder.
    let jpeg_bytes = vec![0xFF, 0xD8, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x01, 0xFF, 0xD9]; // Minimal JPEG-like
    
    let mut jpeg = Jpeg::from_bytes(jpeg_bytes.into())?;
    
    let mut writer = XmpWriter::new();
    writer.creator_tool("Jpeglic");
    writer.label("Processed");
    let xmp_xml = writer.finish();

    let header = b"http://ns.adobe.com/xap/1.0/\0";
    let mut xmp_segment_data = Vec::with_capacity(header.len() + xmp_xml.len());
    xmp_segment_data.extend_from_slice(header);
    xmp_segment_data.extend_from_slice(xmp_xml.as_bytes());

    let segment = img_parts::jpeg::JpegSegment::new_with_contents(
        img_parts::jpeg::markers::APP1,
        img_parts::Bytes::from(xmp_segment_data),
    );

    jpeg.segments_mut().insert(0, segment);
    
    let output = jpeg.encoder().to_bytes();
    println!("Generated JPEG size: {} bytes", output.len());
    
    // Check if XMP is present in output bytes
    let output_str = String::from_utf8_lossy(&output);
    if output_str.contains("Jpeglic") && output_str.contains("Processed") {
        println!("Verification SUCCESS: XMP tags found in output.");
    } else {
        println!("Verification FAILED: XMP tags not found.");
    }

    Ok(())
}

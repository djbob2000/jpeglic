export const AboutTab = () => (
	<div className="mx-auto w-full max-w-3xl px-4 py-6">
		<div className="rounded-xl bg-white p-8 shadow-sm">
			<h2 className="text-2xl font-semibold text-blue-600">XL Converter</h2>
			<p className="mt-2 text-sm text-slate-500">Version 1.0.0</p>
			<p className="mt-4 text-base text-slate-600">
				Easy-to-use image converter for modern formats.
			</p>

			<h3 className="mt-8 text-lg font-semibold text-slate-700">Features</h3>
			<ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
				<li>Support for JPEG XL, AVIF, WebP, JPEG, PNG formats</li>
				<li>Parallel encoding for faster processing</li>
				<li>Lossless JPEG transcoding</li>
				<li>Flexible downscaling options</li>
				<li>Metadata and timestamp preservation</li>
			</ul>

			<h3 className="mt-8 text-lg font-semibold text-slate-700">External Tools</h3>
			<p className="mt-2 text-sm text-slate-600">
				This application uses the following external encoders:
			</p>
			<ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
				<li>libjxl (JPEG XL)</li>
				<li>avifenc (AVIF)</li>
				<li>cwebp (WebP)</li>
				<li>jpegli (JPEG)</li>
				<li>ImageMagick (downscaling and PNG)</li>
				<li>ExifTool (metadata)</li>
			</ul>
		</div>
	</div>
);

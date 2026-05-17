<?php

namespace App\Support;

/**
 * Compresses uploaded evidence photos so we store ~5–10x less per file.
 *
 * Strategy:
 *  - Auto-rotate from EXIF (phone photos come orientation-tagged)
 *  - Resize so the longest side is `maxDimension` px (default 2000)
 *  - Re-encode as JPEG at `quality` (default 82) — visually identical to humans,
 *    drops metadata, much smaller than PNG for photos
 *
 * Uses the GD extension which is bundled with PHP on every host we'd ship to.
 * Imagick would be marginally faster but adds a dependency.
 */
class ImageCompressor
{
    /**
     * Compress the file at $sourcePath in place. If the file was a PNG/WebP, the
     * compressed version is saved alongside as .jpg and the original is removed.
     *
     * @return string The final on-disk path (may differ from $sourcePath if extension changed).
     */
    public static function compress(
        string $sourcePath,
        int $maxDimension = 2000,
        int $quality = 82,
        bool $preserveAlpha = false,
    ): string {
        if (! file_exists($sourcePath)) {
            return $sourcePath;
        }

        $info = @getimagesize($sourcePath);
        if ($info === false) {
            return $sourcePath;
        } // not an image

        [$origW, $origH, $type] = $info;

        $src = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($sourcePath),
            IMAGETYPE_PNG => @imagecreatefrompng($sourcePath),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : null,
            default => null,
        };

        if (! $src) {
            return $sourcePath;
        }

        // EXIF auto-rotate (JPEGs from phones almost always need this)
        if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($sourcePath);
            $orientation = $exif['Orientation'] ?? 1;
            switch ($orientation) {
                case 3: $src = imagerotate($src, 180, 0);
                    break;
                case 6: $src = imagerotate($src, -90, 0);
                    break;
                case 8: $src = imagerotate($src, 90, 0);
                    break;
            }
        }

        $keepAlpha = $preserveAlpha && in_array($type, [IMAGETYPE_PNG, IMAGETYPE_WEBP], true);

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min($maxDimension / max($w, $h), 1.0);
        $newW = max(1, (int) ($w * $scale));
        $newH = max(1, (int) ($h * $scale));
        $dst = imagecreatetruecolor($newW, $newH);

        if ($keepAlpha) {
            // Logos: keep true transparency. No background fill — copy the
            // source's alpha through and emit a PNG so the logo floats on
            // whatever it's placed on (no black box, no white box).
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);
        } else {
            // Photos: flatten onto white (JPEG has no alpha — transparent
            // pixels would otherwise render black) then re-encode as JPEG.
            imagefilledrectangle($dst, 0, 0, $newW, $newH, imagecolorallocate($dst, 255, 255, 255));
            imagealphablending($dst, true);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
        imagedestroy($src);
        $src = $dst;

        if ($keepAlpha) {
            // Already a .png/.webp path — overwrite in place, stay PNG.
            $newPath = preg_replace('/\.(webp|jpe?g)$/i', '.png', $sourcePath);
            if (! str_ends_with(strtolower($newPath), '.png')) {
                $newPath .= '.png';
            }
            imagepng($src, $newPath, 6);
        } else {
            $newPath = preg_replace('/\.(png|webp|jpe?g)$/i', '.jpg', $sourcePath);
            if (! str_ends_with(strtolower($newPath), '.jpg')) {
                $newPath .= '.jpg';
            }
            imagejpeg($src, $newPath, $quality);
        }
        imagedestroy($src);

        if ($newPath !== $sourcePath && file_exists($sourcePath)) {
            @unlink($sourcePath);
        }

        return $newPath;
    }
}

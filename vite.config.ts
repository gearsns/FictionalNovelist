import { defineConfig } from 'vite'
import pkg from './package.json'
import path from 'path';
import license from 'rollup-plugin-license';

const formattedDate = () => {
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月は+1が必要
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0'); // 分は getMinutes()

    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

export default defineConfig(({ mode }) => {
    return {
        base: './',
        plugins: [
            license({
                thirdParty: {
                    output: {
                        file: path.join(__dirname, 'dist', 'OSS_LICENSES.txt'),
                        template(dependencies) {
                            return dependencies
                                .map((dependency) => {
                                    return `========================================================================
Name: ${dependency.name}
Version: ${dependency.version}
License: ${dependency.license}
Author: ${dependency.author?.name || 'N/A'}
URL: ${dependency.homepage || 'N/A'}
------------------------------------------------------------------------
${dependency.licenseText || 'No license text provided.'}
`;
                                })
                                .join('\n');
                        },
                    },
                },
            }),
            {
                name: 'html-transform',
                transformIndexHtml(html: string) {
                    return html.replace('__BUILD_DATE__', formattedDate);
                },
            },
            {
                name: 'minify-html-raw',
                transform(code: string, id: string) {
                    // .html?raw というクエリがついたファイルをフック
                    if (id.endsWith('.html?raw')) {
                        // 簡易的な圧縮：改行と余分な空白を削除
                        const minified = code
                            .replace(/\\n/g, '')         // 改行を消す
                            .replace(/\s{2,}/g, ' ')     // 2つ以上の空白を1つに
                            .replace(/>\s+</g, '><')    // タグ間の空白を消す
                            .replace(/__PACKAGE_VERSION__/g, pkg.version)
                            .replace(/__BUILD_DATE__/g, formattedDate);
                        return { code: minified };
                    }
                }
            },
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@components': path.resolve(__dirname, './src/components'),
            },
        },
        define: {
            // JS内で使用できるグローバル変数を定義
            __BUILD_DATE__: JSON.stringify(formattedDate()),
            'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
            'import.meta.env.APP_DESCRIPTION': JSON.stringify(pkg.description),
            'import.meta.env.APP_TITLE': JSON.stringify(pkg.appConfig.title),
            'import.meta.env.APP_FULL_TITLE': JSON.stringify(`${pkg.appConfig.title} ${pkg.version} - ${pkg.appConfig.shortDescription} -`),
        },
    }
});

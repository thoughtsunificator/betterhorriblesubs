let path = require('path');
module.exports = grunt => {
    let manifest = grunt.file.readJSON('public/manifest.json');
    let PRIVATE = {
        CHROME: {
            OAUTH: grunt.file.readJSON('private/chrome/oauth.json')
        }
    };
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-webstore-upload');
    grunt.loadNpmTasks('grunt-semver');
    grunt.loadNpmTasks('grunt-crx');
    grunt.registerTask('build', ['copy', 'crx', 'compress:sources_to_build', 'clean']);
    grunt.registerTask('upload', ['webstore_upload']);
    grunt.registerTask('update-manifest', reason => {
        let projectManifest = grunt.file.readJSON('public/manifest.json');
        let packageManifest = grunt.file.readJSON('package.json');
        projectManifest.version = packageManifest.version;
        grunt.file.write('public/manifest.json', JSON.stringify(projectManifest, null, 4));
    });
    grunt.registerTask('bump', releaseType => {
        releaseType = releaseType || "patch";
        if (!releaseType.match(/(major|minor|patch)/i)) {
            throw grunt.util.error('Usage: grunt bump:[major|minor|patch]');
        }
        let taskname = 'semver:project:bump:' + releaseType.toLowerCase();
        grunt.task.run([taskname, 'update-manifest']);
    });
    grunt.registerTask('version', () => {
        let projectManifest = grunt.file.readJSON('public/manifest.json');
        let packageManifest = grunt.file.readJSON('package.json');
        grunt.log.write(packageManifest.name + ' version ' + projectManifest.version);
    });
    grunt.config.init({
        copy: {
            sources_to_tmp: {
                expand: true,
                cwd: 'public',
                src: ['**/*'],
                dest: 'tmp/build'
            },
            global_to_tmp: {
                expand: true,
                cwd: '../..',
                src: ['CHANGELOG.txt', 'README.txt', 'LICENSE.txt'],
                dest: 'tmp/build'
            }
        },
        crx: {
            build: {
                src: ['tmp/build/**/*'],
                dest: 'build/' + manifest.version + '/' + manifest.version + '_chrome.crx',
                zipDest: 'build/' + manifest.version + '/' + manifest.version + '_chrome.zip',
                options: {
                    privateKey: 'private/chrome/key.pem'
                }
            }
        },
        compress: {
            sources_to_build: {
                options: {
                    archive: 'build/' + manifest.version + '/' + manifest.version + '_src.zip',
                    mode: 'zip'
                },
                files: [{
                    expand: true,
                    cwd: 'public',
                    dest: '',
                    src: ['./**']
                }]
            }
        },
        clean: {
            remove_tmp: ['tmp']
        },
        webstore_upload: {
            accounts: {
                default: {
                    publish: true,
                    client_id: PRIVATE.CHROME.OAUTH.client_id,
                    client_secret: PRIVATE.CHROME.OAUTH.client_secret,
                    refresh_token: PRIVATE.CHROME.OAUTH.refresh_token
                }
            },
            extensions: {
                default: {
                    appID: 'ajgdjkblmldgbpnhmidonolhokollgfa',
                    zip: 'build/' + manifest.version + '/' + manifest.version + '_chrome.zip'
                }
            }
        },
        semver: {
            project: {
                files: [{
                    src: 'package.json',
                    dest: 'package.json'
                }]
            },
        },
        nodeunit: {
            all: ['test/*.js']
        }
    });
};

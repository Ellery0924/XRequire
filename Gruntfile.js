/**
 * Created by Ellery1 on 15/4/27.
 */

module.exports = function (grunt) {

    grunt.initConfig({

        concat: {
            build: {
                src: ['src/head.txt', 'src/utils.js', 'src/loader.js', 'src/require.js', 'src/end.txt'],
                dest: 'build/XRequire.js'
            }
        },
        uglify: {
            build: {
                src: 'build/XRequire.js',
                dest: 'build/XRequire.min.js'
            }
        },
        clean: {
            all: {
                src: ['build/*']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['clean', 'concat:build', 'uglify:build']);
};

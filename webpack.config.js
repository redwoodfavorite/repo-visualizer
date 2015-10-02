module.exports = {
    entry: "./src/index.js",
    output: {
        path: __dirname,
        filename: "public/bundle.js"
    },
    module: {
        loaders: [
        	{
				test: /\.js?$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel'
		    },
            {
                test: /\.json$/,
                loader: "json"
            }
        ]
    },
    resolve: {
        extensions: ['', '.js', '.json', '.jsx'] 
    }
};
var Genre = require('../models/genre');
var Book = require('../models/book');
var async = require('async');
const validator = require('express-validator');


// Display list of all Genre.
exports.genre_list = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Genre list');
    Genre.find()
        .populate('Genre')
        .sort([['name', 'ascending']])
        .exec(function (err, list_genres) {
            if (err) { return next(err); }
            //successful so render
            res.render('genre_list', { title: 'Genre List', genre_list: list_genres });

        });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Genre detail: ' + req.params.id);
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
            .exec(callback);
        },

        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id })
            .exec(callback);
        },

    }, function(err, results) {
        if (err) { return next(err); }
        if (results.genre==null) { // no results.
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);

        }
        //successful so render
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
        
    });
};


// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Genre create GET');
    res.render('genre_form', { title: 'Create Genre' });

};

// Handle Genre create on POST.
exports.genre_create_post = [ //array of middleware functions

    //validate that the name field is not empty.
    validator.body('name', 'Genre name required').trim().isLength({ min: 1 }),

    //sanitize (escape) the name field.
    validator.sanitizeBody('name').escape(),

    //process request after validation and sanitization.
    (req, res, next) => {

        //extract the validation errors from request
        const errors = validator.validationResult(req);

        //create a genre object with escaped and trimmed data
        var genre = new Genre(
            { name: req.body.name }
        );

        if(!errors.isEmpty()) {
            //there are no errors. Render the form again with sanitized values/error messages
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
            return;
        }
        else {
            //data form form is valid
            //check if genre with same name already exists
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre) {
                    if (err) { return next(err); }

                    if(found_genre) {
                        //genre exists, redirect to its detail page
                        res.redirect(found_genre.url);
                    }
                    else {

                        genre.save(function (err) {
                            if (err) { return next(err); }
                            //genre saved.redirect to genre detail page
                            res.redirect(genre.url);
                        });
                    }
                });
        }
    }


];




// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {

    async.parallel({
        genre: function(callback){
            Genre.findById(req.params.id)
            .populate('genre')
            .exec(callback)
        },
        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id})
            .populate('book')
            .exec(callback)
        },
        
    }, function(err, results) {
        if(err) { return next(err); }
        if(results.genre==null) { //no results
            res.redirect('/catalog/genres');
        }
        //successful so render
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
    });
    
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {

    async.parallel({
        genre: function(callback) {
            Genre.findById(req.body.id)
            .populate('genre')
            .exec(callback)
        },
        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id})
            .populate('book')
            .exec(callback)
        },

    }, function(err, results) {
        if(err) { return next(err); }
        //success
        if(results.genre_books.length > 0) {
            //genre has books, render in the same way as for get route 
            res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books } );
            return;
        }
        else {
            //genre has no books delete object and redirect to the list of genres
            Genre.findByIdAndRemove(req.body.id, function deleteGenre(err) {
                if(err) { return next(err); }
                //success go to genre list
                res.redirect('/catalog/genres')
            })
        }
    });

};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {

    Genre.findById(req.params.id, function(err, genre){
        if(err) { return next(err); }
        if(genre==null) { //no results
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        //success
        res.render('genre_form', { title: 'Update Genre', genre: genre });
    })

};

// Handle Genre update on POST.
exports.genre_update_post = [ //array of middleware functions

    //validate that the name field is not empty.
    validator.body('name', 'Genre name required').trim().isLength({ min: 1 }),

    //sanitize (escape) the name field.
    validator.sanitizeBody('name').escape(),

    //process request after validation and sanitization.
    (req, res, next) => {

        //extract the validation errors from request
        const errors = validator.validationResult(req);

        //create a genre object with escaped and trimmed data
        var genre = new Genre(
            { name: req.body.name, 
            _id: req.params.id 
        });

        if(!errors.isEmpty()) {
            //there are no errors. Render the form again with sanitized values/error messages
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
            return;
        }
        else {
            Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, thegenre) {
                if(err) { return next(err); }
                //successful redirect to genre detail page
                res.redirect(thegenre.url);
            });
        }
        
    }

];
var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var async = require('async');

exports.index = function(req, res){

    //res.send('NOT IMPLEMENTED: Site Home Page');
    async.parallel({
        book_count: function(callback) {
            Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        book_instance_count: function(callback){
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: function(callback){
            BookInstance.countDocuments({status:'Available'}, callback);
        },
        author_count: function(callback){
            Author.countDocuments({}, callback);
        },
        genre_count: function(callback){
            Genre.countDocuments({}, callback);
        }

    }, function(err, results){
        res.render('index', { title: 'Local Library Home', error: err, data: results});
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Book list');
    Book.find({}, 'title author')
        .populate('author')
        .exec(function (err, list_books) {
            if (err) { return next(err); }
            //successful, so render
            res.render('book_list', { title: 'Book List', book_list: list_books});
        });
    
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    
    //res.send('NOT IMPLEMENTED: Book detail: ' + req.params.id);
    async.parallel({
        book: function(callback) {

            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        book_instance: function(callback) {

            BookInstance.find({ 'book': req.params.id })
            .exec(callback);

        },

    }, function(err, results) {
        if(err) { return next(err); }
        if(results.book==null) { //no results
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        //successfful so render.
        res.render('book_detail', { title: results.book.title, book: results.book, book_instance: results.book_instance } );
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Book create GET');
    //get all authors and genres, which we can use for adding to our book
    async.parallel({
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback){
            Genre.find(callback);
        },

    }, function(err, results) {
        if (err) { return next(err); }
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres});
    });
    
};

// Handle book create on POST.
exports.book_create_post = [

    //convert the genre to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre= new Array(req.body.genre);
        }
        next();
    },

    //validate fields
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

    //sanitize fields(using wildcard * )
    sanitizeBody('*').escape(),

    //process request after validation and sanitization
    (req, res, next) => {

        //extract the validation errors from a request
        const errors = validationResult(req);

        //create a book object with escaped and trimmed data
        var book = new Book(
            { title: req.body.title,
              author: req.body.author,
              summary: req.body.summary,
              isbn: req.body.isbn,
              genre: req.body.genre,  

            });

        if (!errors.isEmpty()) {
            //there are  errors, render form again with sanitized values/error messages

            //get all authors and genres for form
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                },

            }, function(err, results) {
                if(err) { return next(err); }

                //mark our selected genres as checked
                for (let i = 0; i < results.genres.length; i++) {
                   if (book.genre.indexOf(results.genres[i]._id) > -1) {
                      results.genres[i].checked='true';
                   } 
                }
                res.render('book_form', { title: 'Create Book', authors:results.authors, genres:results.genres, book: book, errors: errors.Array() });
            });
            return;

            
        } 
        else { 
            //data from form is valid save book
            book.save(function (err) {
                if(err) { return next(err); }
                //successful - redirect to new book record
                res.redirect(book.url);
            });
        }   
        
    }

];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {

    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
            .populate('author')
            .populate('genre')
            .exec(callback)
        },
        book_instance: function(callback) {
            BookInstance.find({ 'book_instance': req.params.id }).exec(callback)

        },

    }, function(err, results) {
        if(err) { return next(err); }
        if(results.book==null) { //no results
            res.redirect('/catalog/books');
        }
        // successful so render
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instance: results.book_instance } );
    });
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {

    async.parallel({
        book: function(callback) {
            Book.findById(req.body.id)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        book_instance: function(callback) {
            BookInstance.find({ 'book': req.body.id }).exec(callback)

        },
    }, function(err, results) {
        if (err) { return next(err); }
        //success
        if (results.book_instance.length > 0) {
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_instance: results.book_instance } );
            return;
        }
        else {
            // book has no copies delete object and redirect to list of all books
            Book.findByIdAndRemove(req.body.id, function deleteBook(err) {
                if (err) { return next(err); }
                //success  go to book list
                res.redirect('/catalog/book')
            })
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: Book update GET');
    //get book authors and genres for form
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);

        },
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        },
    }, function(err, results) {
        if(err) { return next(err); }
        if(results.book==null) { //no results
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);

        }
        //success
        //mark our selected genres as checked
        for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
            for(var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                if(results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
                    results.genres[all_g_iter].checked='true';
                }
            }
        }
        res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
    });
};

// Handle book update on POST.
exports.book_update_post = [

    //convert the genre to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },

    //validate fields
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn', 'ISBN must not be empty.').trim().isLength({ min: 1 }),

    //sanitize fields
    sanitizeBody('title').escape(),
    sanitizeBody('author').escape(),
    sanitizeBody('summary').escape(),
    sanitizeBody('isbn').escape(),
    sanitizeBody('genre').escape(),

    //process request after validation and sanitization
    (req, res, next) => {

        //extract the validation errors form a request
        const errors = validationResult(req);

        //create a book object with escaped/trimmmed data and old id
        var book = new Book(
            {
                title: req.body.title,
                author: req.body.author,
                summary: req.body.summary,
                isbn: req.body.isbn,
                genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
                _id:req.params.id // this is required or a new id will be asigned

            });

        if(!errors.isEmpty()) {
            //there are errors so render form again with sanitized values

            //get all authors and genres for form
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback){
                    Genre.find(callback);
                },

            }, function(err, results) {
                if (err) { return next(err); }

                //mark our selected genres as checked
                for(let i = 0; i < results.genres.length; i++) {
                    if(book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.Array() } );

            });
            return;
        }
        else {
            //data form form is valid, update the record
            Book.findByIdAndUpdate(req.params.id, book, {}, function(err, thebook) {
                if(err) { return next(err); }
                //successful redirect to book detail page
                res.redirect(thebook.url);
            });
        }
    }
];
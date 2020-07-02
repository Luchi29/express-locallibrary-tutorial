var BookInstance = require('../models/bookinstance');
const { body,validationResult } = require('express-validator/check');
var async = require('async');
const { sanitizeBody } = require('express-validator/filter');
var Book = require('../models/book');


// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    
    //res.send('NOT IMPLEMENTED: BookInstance list');
    BookInstance.find()
        .populate('book')
        .exec(function (err, list_bookinstances) {
            if (err) { return next(err);}
            //successful, so render
            res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
        });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

    //res.send('NOT IMPLEMENTED: BookInstance detail: ' + req.params.id);
    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
        if(err) { return next(err); }
        if(bookinstance==null) { // no results.
            var err = new Error('Book copy not found');
            err.status = 404;
            return next(err);

        }
        //successful so render
        res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance: bookinstance});
    })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    //res.send('NOT IMPLEMENTED: BookInstance create GET');
    Book.find({}, 'title')
    .exec(function (err, books) {
        if (err) { return next(err); }
        //successful so render
        res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books});
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    //validate fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be especified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    //sanitize fields
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),


     //process request after validation and sanitization
     (req, res, next) => {

        //extract the validation errors form a request
        const errors = validationResult(req);

        //create a bookinstance object with escaped and trimmed data
        var bookinstance = new BookInstance(
            {
                book:req.body.book,
                imprint: req.body.imprint,
                status: req.body.status,
                due_back: req.body.due_back
            });

        if(!errors.isEmpty()) {
            //there are errors, render again with sanitized values and error messages
            Book.find({}, 'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    //successful so render
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance: bookinstance });

                });
                return;
        }    
        else {
            //data from form is valid
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                //successful - redirect to new record
                res.redirect(bookinstance.url);
            });
        }
     }

];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    
    BookInstance.findById(req.params.id)
        .populate('book')    
        .exec(function(err, bookinstance) {
            if(err) { return next(err); }
            if(bookinstance==null) { //no results
                res.redirect('/catalog/bookinstances');
            }
            //successful so render
            res.render('bookinstance_delete', { title: 'Delete Book Instance', bookinstance: bookinstance } );
    })
    
        
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {

    
        BookInstance.findByIdAndRemove(req.body.id, function deleteBookinstance(err) {
            if (err) { return next(err); }
            //success so redirct
            res.redirect('/catalog/bookinstances')
        })

};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {


    async.parallel({
        bookinstance: function(callback){
            BookInstance.findById(req.params.id)
            .populate('book')
            .exec(callback)
        },
        books: function(callback) {
            Book.find(callback)
        },

    }, function(err, results) {
        if(err) { return next(err); }
        if(results.bookinstance==null) {//no results
            var err = new Error('Book instance not found');
            err.status = 404;
            return next(err);
        }
        //success
        res.render('bookinstance_form', { title: 'Update BookInstance', book_list: results.books, selected_book: results.bookinstance.book._id, bookinstance: results.bookinstance });
    });

};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

    //validate fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be especified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    //sanitize fields
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),


     //process request after validation and sanitization
     (req, res, next) => {

        //extract the validation errors form a request
        const errors = validationResult(req);

        //create a bookinstance object with escaped and trimmed data
        var bookinstance = new BookInstance(
            {
                book:req.body.book,
                imprint: req.body.imprint,
                status: req.body.status,
                due_back: req.body.due_back,
                _id: req.params.id
            });

        if(!errors.isEmpty()) {
            //there are errors, render again with sanitized values and error messages
            Book.find({}, 'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    //successful so render
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance: bookinstance });

                });
                return;
        } 
        else {
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, thebookinstance) {
                if(err) { return next(err); }
                //successful redirect to bookinstance detail page
                res.redirect(thebookinstance.url);
            })
        }
    }
];
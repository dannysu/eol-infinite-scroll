(function() {
    var viewModel = new MainPageViewModel();

    function LifeViewModel(link, image, filename, name) {
        var self = this;

        self.link = link;
        self.id = ko.computed(function() {
            return self.link.replace('/data_objects/', '');
        });

        self.smallImage = image;
        self.mediumImage = ko.computed(function() {
            var url = self.smallImage.replace('_88_88', '_130_130');
            url = url.replace('_orig', '_130_130');
            return url;
        });
        self.largeImage = ko.computed(function() {
            var url = self.smallImage.replace('_88_88', '_580_360');
            url = url.replace('_orig', '_580_360');
            return url;
        });
        self.fullSizeImage = ko.computed(function() {
            return self.smallImage.replace('_88_88', '');
        });

        self.filename = filename;
        self.name = name;

        self.left = ko.observable(0);
        self.top = ko.observable(0);
    }

    function LoadingViewModel(left, top) {
        var self = this;
        self.left = ko.observable(left);
        self.top = ko.observable(top);
    }

    function MainPageViewModel() {
        var self = this;

        self.lives = ko.observableArray([]);
        self.loading = ko.observableArray([]);

        self.selectedItem = ko.observable();
        self.selectItem = function(item) {
            self.selectedItem(item);
        }

        self.page = 0;
        self.furthestPage = 0;
        self.isLoading = false;
        self.getNextPage = function(force_load) {
            force_load = typeof force_load !== 'undefined' ? force_load : false;

            if (self.isLoading && !force_load) {
                return false;
            }

            self.page += 1;

            var url = 'http://dannysu.com/eol/api.php?q='+self.search_term+'&page='+self.page+'&callback=?';
            if (self.collection_id != null) {
                url = 'http://eol.org/api/collections/1.0/'+self.collection_id+'.json?per_page=25&page='+self.page+'&callback=?';
            }

            $.ajax({
                url: url,
                success: function(data) {
                    self.max_items = data.total_items;
                    self.addResults(data.collection_items);
                    self.isLoading = false;

                    if (self.collection_id == null && self.page > self.furthestPage) {
                        self.furthestPage = self.page;
                        localStorage.furthestPage = self.furthestPage;
                    }
                },
                dataType: 'jsonp'
            });

            self.isLoading = true;
            return true;
        }

        self.getNumColumns = function() {
            return Math.floor(self.width / self.div_width);
        }

        self.getLeftMargin = function(columns) {
            return (self.width - (columns * self.div_width)) / 2;
        }

        self.addResults = function(items) {
            var columns = self.getNumColumns();
            var left_margin = self.getLeftMargin(columns);
            var index_offset = self.lives().length;
            var div_container = this.div_container;

            $.each(items, function(index, value) {
                var link = typeof value.link !== 'undefined' ? value.link : '/data_objects/' + value.object_id;
                var filename = typeof value.filename !== 'undefined' ? value.filename : value.name;
                var name = typeof value.filename !== 'undefined' ? value.name : '';
                var life = new LifeViewModel(link, value.source, filename, name);

                var row = Math.floor((index_offset + index) / columns);
                var column = (index_offset + index) % columns;

                var div_left = left_margin + column * self.div_width;
                var div_top = self.top_margin + row * self.div_width;

                life.left(div_left);
                life.top(div_top);

                self.lives.push(life);
            });

            self.padWithLoadingCells();
        }

        self.search_term = "*";
        self.collection_id = null;

        self.width = 0;
        self.max_items = -1;

        // TODO: Can this be moved out to the view to connect to ViewModel?
        self.div_width = 160;
        self.top_margin = 50;

        self.initialize = function(width, search_term, collection_id) {
            self.width = width;
            self.search_term = search_term;
            self.collection_id = collection_id;
            self.padWithLoadingCells();
        }

        self.modalOpen = ko.observable(false);

        self.resize = function(width) {
            if (self.width == width || self.modalOpen()) {
                return;
            }
            self.width = width;

            var columns = self.getNumColumns();
            var left_margin = self.getLeftMargin(columns);

            $.each(self.lives(), function(index, value) {
                var row = Math.floor(index / columns);
                var column = index % columns;

                var div_left = left_margin + column * self.div_width;
                var div_top = self.top_margin + row * self.div_width;

                value.left(div_left);
                value.top(div_top);
            });

            self.padWithLoadingCells();
        }

        self.padWithLoadingCells = function() {
            self.loading.removeAll();

            if (self.max_items >= 0 && self.lives().length >= self.max_items) {
                return;
            }

            var columns = self.getNumColumns();
            var start_col = self.lives().length % columns;
            var num_loading = columns - start_col;
            var last_row = Math.floor(self.lives().length / columns);

            // Figure out how to layout the loading cells based on number of items already loaded
            var left_margin = this.getLeftMargin(columns);
            for (var i = 0; i < num_loading; i++) {
                var div_left = left_margin + (start_col + i) * self.div_width;
                var div_top = self.top_margin + last_row * self.div_width;

                self.loading.push(new LoadingViewModel(div_left, div_top));
            }
        }

        self.contentHeight = ko.computed(function() {
            var columns = self.getNumColumns();
            var rows = (self.lives().length + self.loading().length) / columns;
            return rows * self.div_width;
        });
    }

    // "with: someExpression" is equivalent to "template: { if: someExpression, data: someExpression }"
    ko.bindingHandlers['with'] = {
        makeTemplateValueAccessor: function(valueAccessor) {
            return function() { var value = valueAccessor(); return { 'if': value, 'data': value, 'templateEngine': ko.nativeTemplateEngine.instance } };
        },
        'init': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['with'].makeTemplateValueAccessor(valueAccessor));
        },
        'update': function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            if (viewModel.selectedItem()) {
                $(element).modal('show');
                viewModel.modalOpen(true);

                $(element).on('hidden', function() {
                    viewModel.modalOpen(false);
                    viewModel.resize($(document).width());
                    viewModel.selectedItem(null);
                });
            }
            return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['with'].makeTemplateValueAccessor(valueAccessor), allBindingsAccessor, viewModel, bindingContext);
        }
    };

    ko.applyBindings(viewModel);

    // Notify view model of browser resize so that the layout can be responsive
    // 20px to account for scrollbar
    $(window).resize(function() {
        viewModel.resize($(document).width() - 20);
    });

    var query = window.location.search;
    var search_term = "*";
    var collection_id = null;
    if (query.indexOf("?q=") >= 0) {
        search_term = query.substring(query.indexOf("?q=") + "?q=".length);
    } else if (query.indexOf("?collection=") >= 0) {
        collection_id = query.substring(query.indexOf("?collection=") + "?collection=".length);
    } else if (query.indexOf("?continue=1") >= 0) {
        viewModel.page = (parseInt(localStorage.furthestPage) - 6);
    } else if (query.indexOf("?reset=") >= 0) {
        localStorage.furthestPage = query.substring(query.indexOf("?reset=") + "?reset=".length);
        viewModel.page = parseInt(localStorage.furthestPage);
    }

    viewModel.initialize($(window).width(), search_term, collection_id);

    // Start by fetching 3 pages
    viewModel.getNextPage(true);
    viewModel.getNextPage(true);
    viewModel.getNextPage(true);

    $(document).scroll(function() {
        if ($(document).scrollTop() >= $(document).height() - $(window).height() * 3) {
            if (viewModel.getNextPage()) {
                viewModel.getNextPage(true);
                viewModel.getNextPage(true);
            }
        }
    });

})();

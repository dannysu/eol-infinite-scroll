(function() {
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

    function Layout() {
        var self = this;

        self.width = 0;
        self.height = 0;

        // TODO: Can this be moved out to the view to connect to ViewModel?
        self.div_width = 160;
        self.top_margin = 50;

        self.columns = 0;
        self.getNumColumns = function() {
            return Math.floor(self.width / self.div_width);
        }

        self.left_margin = 0;
        self.getLeftMargin = function(columns) {
            return (self.width - (columns * self.div_width)) / 2;
        }

        self.resize = function(width, height) {
            if (self.width == width && self.height == height) {
                return;
            }
            self.width = width;
            self.height = height;
            self.columns = self.getNumColumns();
            self.left_margin = self.getLeftMargin(self.columns);
        }

        self.position = 0;
        self.updatePosition = function(position) {
            self.position = position;
        }

        self.getNumRows = function() {
            return Math.ceil((self.height - self.top_margin) / self.div_width);
        }

        self.getCurrentRow = function() {
            var row = Math.floor((self.position - self.top_margin) / self.div_width);
            return Math.max(0, row);
        }

        self.getLastRow = function(numItems) {
            return Math.floor(numItems / self.columns);
        }

        self.getCurrentPage = function() {
            var columns = self.getNumColumns();
            var num_items = columns * (self.getCurrentRow() + 1);
            var page = Math.ceil(num_items / 25);
            return page;
        }

        self.getPositionForItemIndex = function(index, updateFn) {
            var row = Math.floor(index / self.columns);
            var column = index % self.columns;

            var div_left = self.left_margin + column * self.div_width;
            var div_top = self.top_margin + row * self.div_width;

            updateFn(div_left, div_top);
        }

        self.getPositionForRowColumn = function(row, col, updateFn) {
            var div_left = self.left_margin + col * self.div_width;
            var div_top = self.top_margin + row * self.div_width;

            updateFn(div_left, div_top);
        }

        self.getContentHeight = function(numItems) {
            var rows = numItems / self.columns;
            return rows * self.div_width;
        }

        self.getLastColumn = function(numItems) {
            return numItems % self.columns;
        }

        self.getNumPadding = function(numItems) {
            return self.columns - self.getLastColumn(numItems);
        }
    }

    function MainPageViewModel() {
        var self = this;

        self.layout = new Layout();

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
                if (self.collection_id == '31473') {
                    url = 'http://dannysu.com/eol/fav.php?page='+self.page;
                } else {
                    url = 'http://eol.org/api/collections/1.0/'+self.collection_id+'.json?per_page=25&page='+self.page+'&callback=?';
                }
            }

            $.ajax({
                url: url,
                success: function(data) {
                    self.max_items = data.total_items;
                    self.addResults(data.collection_items);
                    self.isLoading = false;
                },
                dataType: 'jsonp'
            });

            self.isLoading = true;
            return true;
        }

        self.addResults = function(items) {
            var indexOffset = self.lives().length;

            $.each(items, function(index, value) {
                var link = typeof value.link !== 'undefined' ? value.link : '/data_objects/' + value.object_id;
                var filename = typeof value.filename !== 'undefined' ? value.filename : value.name;
                var name = typeof value.filename !== 'undefined' ? value.name : '';
                var life = new LifeViewModel(link, value.source, filename, name);

                self.layout.getPositionForItemIndex(indexOffset + index, function(left, top) {
                    life.left(left);
                    life.top(top);
                });

                self.lives.push(life);
            });

            self.padWithLoadingCells();
        }

        self.search_term = "*";
        self.collection_id = null;

        self.max_items = -1;

        self.initialize = function(width, height, search_term, collection_id) {
            self.layout.resize(width, height);
            self.search_term = search_term;
            self.collection_id = collection_id;
            self.padWithLoadingCells();
        }

        self.modalOpen = ko.observable(false);

        self.resize = function(width, height) {
            self.layout.resize(width, height);

            if (self.modalOpen()) {
                return;
            }

            $.each(self.lives(), function(index, value) {
                self.layout.getPositionForItemIndex(index, function(left, top) {
                    value.left(left);
                    value.top(top);
                });
            });

            self.padWithLoadingCells();
        }

        self.padWithLoadingCells = function() {
            self.loading.removeAll();

            if (self.max_items >= 0 && self.lives().length >= self.max_items) {
                return;
            }

            var lastRow = self.layout.getLastRow(self.lives().length);
            var lastColumn = self.layout.getLastColumn(self.lives().length);
            var numLoadingCells = self.layout.getNumPadding(self.lives().length);
            for (var i = 0; i < numLoadingCells; i++) {
                self.layout.getPositionForRowColumn(lastRow, lastColumn + i, function(left, top) {
                    self.loading.push(new LoadingViewModel(left, top));
                });
            }
        }

        self.contentHeight = ko.computed(function() {
            return self.layout.getContentHeight(self.lives().length + self.loading().length);
        });

        self.collect = function(life, click, action) {
            var action = typeof action !== 'undefined' ? action : 'add';
            var url = 'http://dannysu.com/eol/fav.php?';
            url += 'link='+encodeURI(life.link);
            url += '&image='+encodeURI(life.smallImage);
            url += '&filename='+encodeURI(life.filename);
            url += '&name='+encodeURI(life.name);
            url += '&action=' + action;
            url += '&pass=' + encodeURI(localStorage.password);
            url += '&callback=?';
            $.ajax({
                url: url,
                success: function(data) {
                    if (data.success) {
                        self.statusMessage('Success!');
                    } else {
                        self.statusMessage('There was an error.');
                    }
                },
                dataType: 'jsonp'
            });

            self.statusMessage('Please wait...');
        }
        self.statusMessage = ko.observable('');

        self.remove = function() {
            self.collect(self.selectedItem(), null, 'remove');
        }

        self.pageOffset = 0;
        self.onScroll = function(position) {
            self.layout.updatePosition(position);

            // Only save progress for show all page
            if (self.collection_id == null && self.search_term == "*") {
                self.saveProgress();
            }
        }

        self.saveProgress = function() {
            var page = self.layout.getCurrentPage();
            page += Math.max(0, self.pageOffset - 1);

            if (page > self.furthestPage) {
                self.furthestPage = page;
                localStorage.furthestPage = self.furthestPage;
            }
        }
    }

    var viewModel = new MainPageViewModel();

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
                viewModel.statusMessage('');

                $(element).on('hidden', function() {
                    viewModel.modalOpen(false);
                    viewModel.resize($(document).width(), $(window).height());
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
        viewModel.resize($(document).width() - 20, $(window).height());
    });

    var hasPageStored = false;
    if (localStorage.getItem("furthestPage") != null) {
        hasPageStored = true;
    }

    var query = window.location.search;
    var search_term = "*";
    var collection_id = null;
    if (query.indexOf("?q=") >= 0) {
        search_term = query.substring(query.indexOf("?q=") + "?q=".length);
    } else if (query.indexOf("?collection=") >= 0) {
        collection_id = query.substring(query.indexOf("?collection=") + "?collection=".length);
    } else if (query.indexOf("?continue=1") >= 0 && hasPageStored) {
        viewModel.page = Math.max(0, (parseInt(localStorage.furthestPage) - 1));
        viewModel.pageOffset = parseInt(localStorage.furthestPage);
    } else if (query.indexOf("?reset=") >= 0) {
        localStorage.furthestPage = query.substring(query.indexOf("?reset=") + "?reset=".length);
        viewModel.page = Math.max(0, (parseInt(localStorage.furthestPage) - 1));
        hasPageStored = true;
    }

    if (hasPageStored) {
        viewModel.furthestPage = parseInt(localStorage.furthestPage);
    }
    viewModel.initialize($(window).width(), $(window).height(), search_term, collection_id);

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
        viewModel.onScroll($(document).scrollTop());
    });

})();

'use strict';

var express = require('express');
var controller = require('./reddit.controller');

var router = express.Router();

router.get('/:username', controller.index);

module.exports = router;
import os

from PySide6.QtWidgets import(
    QWidget,
    QGridLayout,
    QVBoxLayout,
    QHBoxLayout,
    QCheckBox,
    QPushButton,
    QLabel,
    QSizePolicy,
    QFormLayout,
    QSpacerItem,
    QTextEdit,
)
from PySide6.QtCore import(
    Signal,
    QObject,
    Qt,
    QUrl,
)
from PySide6.QtGui import(
    QDesktopServices,
)

from ui.theme import setTheme
from ui.widget_manager import WidgetManager
from ui.scroll_area import ScrollArea
from ui.spinbox import SpinBox
from ui.combobox import ComboBox
from data.logging_manager import LoggingManager
from ui.notifications import Notifications

class Signals(QObject):
    custom_resampling = Signal(bool)
    disable_sorting = Signal(bool)
    enable_jxl_effort_10 = Signal(bool)
    enable_quality_prec_snap = Signal(bool)
    change_jpg_encoder = Signal(str)

class SettingsTab(QWidget):
    def __init__(self):
        super(SettingsTab, self).__init__()

        self.main_lt = QGridLayout()
        self.setLayout(self.main_lt)

        self.wm = WidgetManager("SettingsTab")
        self.signals = Signals()
        self.logging_manager = LoggingManager()
        self.notifications = Notifications(self)

        # Categories
        self.categories_lt = QVBoxLayout()

        # Settings
        self.settings_sa = ScrollArea(self)
        self.settings_w = QWidget()
        self.settings_lt = QFormLayout()

        self.settings_w.setLayout(self.settings_lt)
        self.settings_sa.setWidget(self.settings_w)

        # Settings - widgets
        self.dark_theme_cb = self.wm.addWidget("dark_theme_cb", QCheckBox("Dark Theme", self))
        self.disable_on_startup_l = QLabel("Disable on Startup")
        self.disable_downscaling_startup_cb = self.wm.addWidget("disable_downscaling_startup_cb", QCheckBox("Downscaling", self))
        self.disable_delete_startup_cb = self.wm.addWidget("disable_delete_startup_cb", QCheckBox("Delete Original", self))
        self.no_exceptions_cb = self.wm.addWidget("no_exceptions_cb", QCheckBox("Disable Exception Popups", self))
        self.no_sorting_cb = self.wm.addWidget("no_sorting_cb", QCheckBox("Input - Disable Sorting", self))
        self.enable_jxl_effort_10 = self.wm.addWidget("enable_jxl_effort_10", QCheckBox("JPEG XL - Enable Effort 10", self))
        self.disable_progressive_jpegli_cb = self.wm.addWidget("disable_progressive_jpegli_cb", QCheckBox("JPEGLI - Disable Progressive Scan", self))
        self.custom_resampling_cb = self.wm.addWidget("custom_resampling_cb", QCheckBox("Downscaling - Custom Resampling", self))
        self.quality_prec_snap_cb = self.wm.addWidget("quality_prec_snap_cb", QCheckBox("Quality Slider - Snap to Individual Values"))
        self.jxl_lossless_jpeg_cb = self.wm.addWidget("jxl_lossless_jpeg_cb", QCheckBox("JPEG XL - Automatic JPEG Recompression"))
        self.play_sound_on_finish_cb = self.wm.addWidget("play_sound_on_finish_cb", QCheckBox("Play Sound When Conversion Finishes"))
        self.play_sound_on_finish_vol_l = self.wm.addWidget("play_sound_on_finish_vol_l", QLabel("Volume"))
        self.play_sound_on_finish_vol_sb = self.wm.addWidget("play_sound_on_finish_vol_sb", SpinBox())
        self.play_sound_on_finish_vol_sb.setRange(0, 100)
        self.play_sound_on_finish_vol_sb.setSuffix("%")

        self.jpg_encoder_l = self.wm.addWidget("jpg_encoder_l", QLabel("JPEG Encoder"))
        self.jpg_encoder_cmb = self.wm.addWidget("jpg_encoder_cmb", ComboBox())
        self.jpg_encoder_cmb.addItems((
            "JPEGLI",
            "libjpeg",
        ))
        self.keep_if_larger_cb = self.wm.addWidget("keep_if_larger_cb", QCheckBox("Do Not Delete Original When Result is Larger"))
        self.copy_if_larger_cb = self.wm.addWidget("copy_if_larger_cb", QCheckBox("Copy Original When Result is Larger"))

        self.exiftool_l = QLabel("ExifTool Arguments")
        self.exiftool_wipe_l = QLabel("Wipe")
        self.exiftool_wipe_te = self.wm.addWidget("exiftool_wipe_te", QTextEdit())
        self.exiftool_preserve_l = QLabel("Preserve")
        self.exiftool_preserve_te = self.wm.addWidget("exiftool_preserve_te", QTextEdit())
        self.exiftool_custom_l = QLabel("Custom")
        self.exiftool_custom_te = self.wm.addWidget("exiftool_custom_te", QTextEdit())

        self.custom_args_cb = self.wm.addWidget("custom_args_cb", QCheckBox("Additional Encoder Arguments"))
        self.avifenc_args_l = QLabel("avifenc\nAVIF")
        self.avifenc_args_te = self.wm.addWidget("avifenc_args_te", QTextEdit())
        self.cjpegli_args_l = QLabel("cjpegli\nJPEG")
        self.cjpegli_args_te = self.wm.addWidget("cjpegli_args_te", QTextEdit())
        self.cjxl_args_l = QLabel("cjxl\nJPEG XL")
        self.cjxl_args_te = self.wm.addWidget("cjxl_args_te", QTextEdit())
        self.im_args_l = QLabel("ImageMagick\nWebP\nJPEG (libjpeg)")
        self.im_args_te = self.wm.addWidget("im_args_te", QTextEdit())
        self.empty_l = QLabel("")       # Workaround for a bug in QScrollArea. The scroll bar stops responding when rendered inside a height limited QTabWidget with the last item being QTextEdit. 

        self.start_logging_btn = self.wm.addWidget("start_logging_btn", QPushButton("Start Logging"))
        self.open_log_dir_btn = self.wm.addWidget("open_log_dir_btn", QPushButton("Open Logs Folder"))
        self.wipe_log_dir_btn = self.wm.addWidget("wipe_log_dir_btn", QPushButton("Wipe Logs Folder"))
        self.start_logging_btn.setCheckable(True)

        # Settings - signals
        self.dark_theme_cb.toggled.connect(self.setDarkModeEnabled)
        self.custom_args_cb.toggled.connect(self.onCustomArgsToggled)
        self.play_sound_on_finish_cb.toggled.connect(self.onPlaySoundOnFinishVolumeToggled)

        self.no_sorting_cb.toggled.connect(self.signals.disable_sorting)
        self.enable_jxl_effort_10.clicked.connect(self.signals.enable_jxl_effort_10)
        self.custom_resampling_cb.toggled.connect(self.signals.custom_resampling.emit)
        self.quality_prec_snap_cb.toggled.connect(self.signals.enable_quality_prec_snap)
        self.jpg_encoder_cmb.currentTextChanged.connect(self.signals.change_jpg_encoder)

        self.start_logging_btn.clicked.connect(self.toggleLogging)
        self.open_log_dir_btn.clicked.connect(self.openLogsDir)
        self.wipe_log_dir_btn.clicked.connect(self.wipeLogsDir)

        # Settings - layout
        ## General
        disable_on_startup_hb = QHBoxLayout()
        disable_on_startup_hb.addWidget(self.disable_on_startup_l)
        disable_on_startup_hb.addWidget(self.disable_delete_startup_cb)
        disable_on_startup_hb.addWidget(self.disable_downscaling_startup_cb)
        self.settings_lt.addRow(disable_on_startup_hb)

        self.settings_lt.addRow(self.dark_theme_cb)
        self.settings_lt.addRow(self.quality_prec_snap_cb)
        self.settings_lt.addRow(self.no_sorting_cb)
        self.settings_lt.addRow(self.play_sound_on_finish_cb)
        play_sound_on_finish_vol_hb = QHBoxLayout()
        play_sound_on_finish_vol_hb.addWidget(self.play_sound_on_finish_vol_l)
        play_sound_on_finish_vol_hb.addWidget(self.play_sound_on_finish_vol_sb)
        self.settings_lt.addRow(play_sound_on_finish_vol_hb)

        ## Conversion
        self.settings_lt.addRow(self.jxl_lossless_jpeg_cb)
        self.jpg_encoder_hb = QHBoxLayout()
        self.jpg_encoder_hb.addWidget(self.jpg_encoder_l)
        self.jpg_encoder_hb.addWidget(self.jpg_encoder_cmb)
        self.settings_lt.addRow(self.jpg_encoder_hb)
        self.settings_lt.addRow(self.disable_progressive_jpegli_cb)
        self.settings_lt.addRow(self.keep_if_larger_cb)
        self.settings_lt.addRow(self.copy_if_larger_cb)

        ## Advanced
        self.settings_lt.addRow(self.enable_jxl_effort_10)
        self.settings_lt.addRow(self.custom_resampling_cb)
        self.settings_lt.addRow(self.no_exceptions_cb)
        self.settings_lt.addRow(self.exiftool_l)
        self.settings_lt.addRow(self.exiftool_wipe_l, self.exiftool_wipe_te)
        self.settings_lt.addRow(self.exiftool_preserve_l, self.exiftool_preserve_te)
        self.settings_lt.addRow(self.exiftool_custom_l, self.exiftool_custom_te)
        self.settings_lt.addRow(self.custom_args_cb)
        self.settings_lt.addRow(self.cjxl_args_l, self.cjxl_args_te)
        self.settings_lt.addRow(self.avifenc_args_l, self.avifenc_args_te)
        self.settings_lt.addRow(self.cjpegli_args_l, self.cjpegli_args_te)
        self.settings_lt.addRow(self.im_args_l, self.im_args_te)
        self.settings_lt.addRow(self.empty_l)
        logging_hb = QHBoxLayout()
        logging_hb.addWidget(self.start_logging_btn)
        logging_hb.addWidget(self.open_log_dir_btn)
        logging_hb.addWidget(self.wipe_log_dir_btn)
        self.settings_lt.addRow(logging_hb)
        
        ## Layout
        play_sound_on_finish_vol_hb.setAlignment(Qt.AlignLeft)
        self.play_sound_on_finish_vol_sb.setMinimumWidth(150)

        self.avifenc_args_te.setMaximumHeight(50)
        self.cjpegli_args_te.setMaximumHeight(50)
        self.cjxl_args_te.setMaximumHeight(50)
        self.im_args_te.setMaximumHeight(50)

        self.exiftool_wipe_te.setMaximumHeight(50)
        self.exiftool_preserve_te.setMaximumHeight(50)
        self.exiftool_custom_te.setMaximumHeight(50)

        self.avifenc_args_te.setAcceptRichText(False)
        self.cjpegli_args_te.setAcceptRichText(False)
        self.cjxl_args_te.setAcceptRichText(False)
        self.im_args_te.setAcceptRichText(False)

        self.jpg_encoder_cmb.setMinimumWidth(150)
        self.jpg_encoder_hb.addStretch()

        # Categories - widgets
        self.general_btn = QPushButton("General", self)
        self.conversion_btn = QPushButton("Conversion", self)
        self.advanced_btn  = QPushButton("Advanced", self)
        self.restore_defaults_btn = QPushButton("Reset to Default", self)

        self.general_btn.clicked.connect(lambda: self.changeCategory("General"))
        self.conversion_btn.clicked.connect(lambda: self.changeCategory("Conversion"))
        self.advanced_btn.clicked.connect(lambda: self.changeCategory("Advanced"))
        self.restore_defaults_btn.clicked.connect(self.resetToDefault)

        # Categories - layout
        self.categories_lt.addWidget(self.general_btn)
        self.categories_lt.addWidget(self.conversion_btn)
        self.categories_lt.addWidget(self.advanced_btn)
        self.categories_lt.addItem(QSpacerItem(10, 10, QSizePolicy.Minimum, QSizePolicy.Expanding))
        self.categories_lt.addWidget(self.restore_defaults_btn)

        self.general_btn.setCheckable(True)
        self.conversion_btn.setCheckable(True)
        self.advanced_btn.setCheckable(True)
        self.categories_lt.setContentsMargins(0, 1, 0, 1)

        # Main layout
        self.main_lt.addLayout(self.categories_lt, 0, 0)
        self.main_lt.addWidget(self.settings_sa, 0, 1)

        self.main_lt.setColumnStretch(0, 3)
        self.main_lt.setColumnStretch(1, 7)

        # Misc.
        self.changeCategory("General")
        self.resetToDefault()
        self.wm.loadState()

        # Refresh state
        self.onCustomArgsToggled()
        self.onPlaySoundOnFinishVolumeToggled()

        # Apply Settings
        self.setDarkModeEnabled(self.dark_theme_cb.isChecked())

    def changeCategory(self, category):
        # Set vars
        general = category == "General"
        conversion = category == "Conversion"
        advanced = category == "Advanced"

        # Set checked
        self.general_btn.setChecked(general)
        self.conversion_btn.setChecked(conversion)
        self.advanced_btn.setChecked(advanced)

        # Set visible
        self.dark_theme_cb.setVisible(general)
        self.disable_on_startup_l.setVisible(general)
        self.disable_downscaling_startup_cb.setVisible(general)
        self.disable_delete_startup_cb.setVisible(general)
        self.no_sorting_cb.setVisible(general)
        self.quality_prec_snap_cb.setVisible(general)
        self.play_sound_on_finish_cb.setVisible(general)
        self.play_sound_on_finish_vol_l.setVisible(general)
        self.play_sound_on_finish_vol_sb.setVisible(general)

        self.jxl_lossless_jpeg_cb.setVisible(conversion)
        self.jpg_encoder_l.setVisible(conversion)
        self.jpg_encoder_cmb.setVisible(conversion)
        self.disable_progressive_jpegli_cb.setVisible(conversion)
        self.keep_if_larger_cb.setVisible(conversion)
        self.copy_if_larger_cb.setVisible(conversion)

        self.no_exceptions_cb.setVisible(advanced)
        self.enable_jxl_effort_10.setVisible(advanced)
        self.custom_resampling_cb.setVisible(advanced)
        self.exiftool_l.setVisible(advanced)
        self.exiftool_wipe_l.setVisible(advanced)
        self.exiftool_wipe_te.setVisible(advanced)
        self.exiftool_preserve_l.setVisible(advanced)
        self.exiftool_preserve_te.setVisible(advanced)
        self.exiftool_custom_l.setVisible(advanced)
        self.exiftool_custom_te.setVisible(advanced)
        self.custom_args_cb.setVisible(advanced)
        self.avifenc_args_l.setVisible(advanced)
        self.avifenc_args_te.setVisible(advanced)
        self.cjxl_args_l.setVisible(advanced)
        self.cjxl_args_te.setVisible(advanced)
        self.cjpegli_args_l.setVisible(advanced)
        self.cjpegli_args_te.setVisible(advanced)
        self.im_args_l.setVisible(advanced)
        self.im_args_te.setVisible(advanced)
        self.empty_l.setVisible(advanced)
        self.start_logging_btn.setVisible(advanced)
        self.open_log_dir_btn.setVisible(advanced)
        self.wipe_log_dir_btn.setVisible(advanced)

    def onCustomArgsToggled(self):
        enabled = self.custom_args_cb.isChecked()

        self.cjxl_args_l.setEnabled(enabled)
        self.cjxl_args_te.setEnabled(enabled)
        self.avifenc_args_l.setEnabled(enabled)
        self.avifenc_args_te.setEnabled(enabled)
        self.cjpegli_args_l.setEnabled(enabled)
        self.cjpegli_args_te.setEnabled(enabled)
        self.im_args_l.setEnabled(enabled)
        self.im_args_te.setEnabled(enabled)

    def onPlaySoundOnFinishVolumeToggled(self):
        enabled = self.play_sound_on_finish_cb.isChecked()
        self.play_sound_on_finish_vol_l.setEnabled(enabled)
        self.play_sound_on_finish_vol_sb.setEnabled(enabled)

    def setDarkModeEnabled(self, enabled):
        setTheme("dark" if enabled else "light")

    def toggleLogging(self):
        if self.logging_manager.isLoggingToFile():
            self.logging_manager.stopLoggingToFile()
            self.start_logging_btn.setText("Start Logging")
        else:
            self.logging_manager.startLoggingToFile("DEBUG")
            self.start_logging_btn.setText("Stop Logging")

    def openLogsDir(self):
        logs_dir = self.logging_manager.getLogsDir()
        if not os.path.isdir(logs_dir):
            self.notifications.notify("No logs", "No logs have been found.")
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(logs_dir))
    
    def wipeLogsDir(self):
        try:
            self.logging_manager.wipeLogsDir()
        except OSError as e:
            self.notifications.notify("File Error", f"Cannot wipe logs folder.\n{e}")

    def getSettings(self):
        return {
            "custom_resampling": self.custom_resampling_cb.isChecked(),
            "sorting_disabled": self.no_sorting_cb.isChecked(),
            "disable_downscaling_startup": self.disable_downscaling_startup_cb.isChecked(),
            "disable_delete_startup": self.disable_delete_startup_cb.isChecked(),
            "no_exceptions": self.no_exceptions_cb.isChecked(),
            "enable_jxl_effort_10": self.enable_jxl_effort_10.isChecked(),
            "disable_progressive_jpegli": self.disable_progressive_jpegli_cb.isChecked(),
            "enable_custom_args": self.custom_args_cb.isChecked(),
            "cjxl_args": self.cjxl_args_te.toPlainText(),
            "avifenc_args": self.avifenc_args_te.toPlainText(),
            "cjpegli_args": self.cjpegli_args_te.toPlainText(),
            "im_args": self.im_args_te.toPlainText(),
            "enable_quality_precision_snapping": self.quality_prec_snap_cb.isChecked(),
            "jpg_encoder": self.jpg_encoder_cmb.currentText(),
            "jxl_lossless_jpeg": self.jxl_lossless_jpeg_cb.isChecked(),
            "play_sound_on_finish": self.play_sound_on_finish_cb.isChecked(),
            "play_sound_on_finish_vol": round(self.play_sound_on_finish_vol_sb.value() / 100, 2),
            "keep_if_larger": self.keep_if_larger_cb.isChecked(),
            "copy_if_larger": self.copy_if_larger_cb.isChecked(),
            "exiftool_wipe": self.exiftool_wipe_te.toPlainText(),
            "exiftool_preserve": self.exiftool_preserve_te.toPlainText(),
            "exiftool_custom": self.exiftool_custom_te.toPlainText(),
        }
    
    def resetToDefault(self):
        self.dark_theme_cb.setChecked(True)
        self.no_sorting_cb.setChecked(False)
        self.disable_downscaling_startup_cb.setChecked(True)
        self.disable_delete_startup_cb.setChecked(True)
        self.no_exceptions_cb.setChecked(False)
        self.quality_prec_snap_cb.setChecked(False)
        self.jxl_lossless_jpeg_cb.setChecked(False)
        self.play_sound_on_finish_cb.setChecked(False)
        self.play_sound_on_finish_vol_sb.setValue(60)

        self.enable_jxl_effort_10.setChecked(False)
        self.custom_resampling_cb.setChecked(False)
        self.disable_progressive_jpegli_cb.setChecked(False)
        self.jpg_encoder_cmb.setCurrentIndex(0)
        self.keep_if_larger_cb.setChecked(False)
        self.copy_if_larger_cb.setChecked(False)

        self.custom_args_cb.setChecked(False)
        self.cjxl_args_te.clear()
        self.cjpegli_args_te.clear()
        self.im_args_te.clear()
        self.avifenc_args_te.clear()

        self.exiftool_wipe_te.setText("-all= -tagsFromFile @ -icc_profile:all -ColorSpace:all $dst -overwrite_original")
        self.exiftool_preserve_te.setText("-tagsFromFile $src $dst -overwrite_original")
        self.exiftool_custom_te.setText("-all= $dst -overwrite_original")
        
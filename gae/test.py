import sys
import unittest
import os

def main(sdk_path, test_path):
    sys.path.insert(0, sdk_path)
    import dev_appserver
    dev_appserver.fix_sys_path()
    suite = unittest.TestLoader().discover(test_path)
    unittest.TextTestRunner(verbosity=2).run(suite)

if __name__ == '__main__':
    main(sys.argv[1], os.path.join(os.path.dirname(__file__), "test"))
